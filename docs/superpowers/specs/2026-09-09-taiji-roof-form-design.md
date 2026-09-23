# XVI main-hall roof form and renderer consistency

Independent comparison with the approved reference identifies the main roof's broadly scooped profile as a larger issue than additional small details. Prototype steady upper slopes with lift concentrated near eaves, keeping footprint/ridge height/base values and leaving annex roofs unchanged. Surface, tiles, rafters and trim must use the same profile. Verify fit against upper-storey geometry and compare at the same overview distance before acceptance.

Separately, an actual renderer-adapter omission was found while investigating the path mode's black shadow fill: source HemisphereLight is ignored by the supported-light list. Convert that existing hemisphere irradiance into an owned HDR radiance contribution using the first-order analytic inversion. Preserve source HDR and intensity/rotation, handle half-float encoding and zero intensity, and validate diffuse irradiance numerically. This is renderer consistency, not an added light or exposure adjustment. The path render may still differ under real occlusion; investigate any remaining black bands rather than tuning the conversion.

XV is preserved; neither change modifies the original project, building footprints, controls, light colors/intensities or exposure.
