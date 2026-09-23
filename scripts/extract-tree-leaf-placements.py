#!/usr/bin/env python3
"""Extract deterministic authored leaf placements from tree-small-02's leaf primitive."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components


COMPONENT_DTYPES = {
    5121: np.dtype("u1"),
    5123: np.dtype("<u2"),
    5125: np.dtype("<u4"),
    5126: np.dtype("<f4"),
}
TYPE_WIDTHS = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}


def accessor_array(gltf: dict, root: Path, accessor_index: int) -> np.ndarray:
    accessor = gltf["accessors"][accessor_index]
    view = gltf["bufferViews"][accessor["bufferView"]]
    dtype = COMPONENT_DTYPES[accessor["componentType"]]
    width = TYPE_WIDTHS[accessor["type"]]
    offset = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
    buffer_path = root / gltf["buffers"][view["buffer"]]["uri"]
    shape = (accessor["count"],) if width == 1 else (accessor["count"], width)
    expected_stride = dtype.itemsize * width
    stride = view.get("byteStride", expected_stride)
    if stride == expected_stride:
        return np.memmap(buffer_path, dtype=dtype, mode="r", offset=offset, shape=shape)
    raw = np.memmap(buffer_path, dtype="u1", mode="r", offset=offset, shape=(view["byteLength"],))
    return np.ndarray(shape, dtype=dtype, buffer=raw, strides=(stride, dtype.itemsize))


def component_labels(indices: np.ndarray, vertex_count: int) -> tuple[int, np.ndarray]:
    triangles = indices.reshape(-1, 3)
    rows = np.concatenate((triangles[:, 0], triangles[:, 1], triangles[:, 2])).astype(np.int32)
    columns = np.concatenate((triangles[:, 1], triangles[:, 2], triangles[:, 0])).astype(np.int32)
    graph = coo_matrix(
        (np.ones(rows.size, dtype=np.uint8), (rows, columns)),
        shape=(vertex_count, vertex_count),
    ).tocsr()
    return connected_components(graph, directed=False, return_labels=True)


def component_centers(positions: np.ndarray, labels: np.ndarray, count: int) -> tuple[np.ndarray, np.ndarray]:
    sizes = np.bincount(labels, minlength=count)
    sums = np.zeros((count, 3), dtype=np.float64)
    np.add.at(sums, labels, positions)
    return sums / sizes[:, None], sizes


def morton_order(points: np.ndarray) -> np.ndarray:
    bounds_min = points.min(axis=0)
    span = np.maximum(points.max(axis=0) - bounds_min, 1e-9)
    quantized = np.clip(((points - bounds_min) / span * 1023).astype(np.uint32), 0, 1023)
    keys = np.zeros(points.shape[0], dtype=np.uint64)
    for bit in range(10):
        keys |= ((quantized[:, 0] >> bit) & 1).astype(np.uint64) << (3 * bit)
        keys |= ((quantized[:, 1] >> bit) & 1).astype(np.uint64) << (3 * bit + 1)
        keys |= ((quantized[:, 2] >> bit) & 1).astype(np.uint64) << (3 * bit + 2)
    return np.argsort(keys, kind="stable")


def spatial_sample(centers: np.ndarray, target: int) -> np.ndarray:
    if centers.shape[0] <= target:
        return np.arange(centers.shape[0], dtype=np.int32)
    tip_count = min(400, target)
    tips = np.argsort(centers[:, 1], kind="stable")[-tip_count:]
    is_tip = np.zeros(centers.shape[0], dtype=bool)
    is_tip[tips] = True
    spatial = morton_order(centers)
    remaining = spatial[~is_tip[spatial]]
    wanted = target - tip_count
    picks = remaining[np.floor(np.arange(wanted) * remaining.size / wanted).astype(np.int64)]
    return np.concatenate((picks, tips)).astype(np.int32)


def stable_direction(vector: np.ndarray) -> np.ndarray:
    dominant = int(np.argmax(np.abs(vector)))
    return vector if vector[dominant] >= 0 else -vector


def rounded(values: np.ndarray) -> list[float]:
    return [float(value) for value in np.round(values, 5)]


def extract(source: Path, output: Path, target: int) -> dict:
    gltf = json.loads(source.read_text())
    root = source.parent
    primitive = gltf["meshes"][0]["primitives"][1]
    if primitive.get("material") != 1:
        raise ValueError("Expected leaf primitive 1 to use material 1")
    positions = accessor_array(gltf, root, primitive["attributes"]["POSITION"])
    normals = accessor_array(gltf, root, primitive["attributes"]["NORMAL"])
    indices = accessor_array(gltf, root, primitive["indices"])

    component_count, labels = component_labels(indices, positions.shape[0])
    centers, sizes = component_centers(positions, labels, component_count)
    selected = spatial_sample(centers, min(target, component_count))

    order = np.argsort(labels, kind="stable")
    offsets = np.concatenate(([0], np.cumsum(sizes)))
    leaves: list[dict] = []
    for component in selected:
        members = order[offsets[component]:offsets[component + 1]]
        points = np.asarray(positions[members], dtype=np.float64)
        center = centers[component]
        centered = points - center
        covariance = centered.T @ centered / max(points.shape[0], 1)
        _, eigenvectors = np.linalg.eigh(covariance)
        normal = eigenvectors[:, 0]
        mean_normal = np.asarray(normals[members], dtype=np.float64).mean(axis=0)
        if np.linalg.norm(mean_normal) > 1e-8:
            if np.dot(normal, mean_normal) < 0:
                normal = -normal
        else:
            normal = stable_direction(normal)
        normal /= np.linalg.norm(normal)

        tangent = eigenvectors[:, 2] - normal * np.dot(eigenvectors[:, 2], normal)
        tangent = stable_direction(tangent / np.linalg.norm(tangent))
        lateral = np.cross(normal, tangent)
        dimensions = np.array([
            np.ptp(centered @ tangent),
            np.ptp(centered @ lateral),
            np.ptp(centered @ normal),
        ])
        leaves.append({"p": rounded(center), "n": rounded(normal), "t": rounded(tangent), "d": rounded(dimensions)})

    quantiles = [0, 0.25, 0.5, 0.75, 0.9, 0.99, 1]
    tip_count = min(400, len(leaves))
    sampling = (
        "all connected components"
        if component_count <= target
        else f"{tip_count} highest-Y crown-tip components plus {len(leaves) - tip_count} uniform samples in 10-bit Morton order"
    )
    document = {
        "source": "asset-sources/tree-small-02/tree_small_02_1k.gltf#mesh=0&primitive=1",
        "sourceBounds": {
            "min": rounded(np.asarray(positions).min(axis=0)),
            "max": rounded(np.asarray(positions).max(axis=0)),
        },
        "sourceComponents": int(component_count),
        "sampledComponents": len(leaves),
        "componentVertexStats": {
            "min": int(sizes.min()),
            "max": int(sizes.max()),
            "quantiles": {str(q): float(np.quantile(sizes, q)) for q in quantiles},
        },
        "sampling": sampling,
        "leaves": leaves,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(document, separators=(",", ":")) + "\n")
    return document


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=Path("asset-sources/tree-small-02/tree_small_02_1k.gltf"))
    parser.add_argument("--output", type=Path, default=Path("public/models/taiji/tree-small-02-leaf-placements.json"))
    parser.add_argument("--target", type=int, default=16_000)
    args = parser.parse_args()
    document = extract(args.source, args.output, args.target)
    print(json.dumps({key: document[key] for key in ("sourceBounds", "sourceComponents", "sampledComponents", "componentVertexStats", "sampling")}, indent=2))


if __name__ == "__main__":
    main()
