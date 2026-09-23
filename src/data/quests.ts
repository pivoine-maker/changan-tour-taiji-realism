import type { Point2 } from './world';

export type QuestChapterId =
  | 'market-passage'
  | 'ward-curfew'
  | 'zhuque-axis'
  | 'palace-ritual'
  | 'southern-gate-survey'
  | 'canal-waterworks'
  | 'eastern-ward-life'
  | 'inner-palace-record';
export type QuestNpcId =
  | 'npc-sogdian-merchant'
  | 'npc-ward-elder'
  | 'npc-roof-artisan'
  | 'npc-zhuque-patrol'
  | 'npc-palace-attendant'
  | 'npc-city-gate-guard'
  | 'npc-waterworks-clerk'
  | 'npc-eastern-ward-scribe'
  | 'npc-palace-archivist';
export type QuestTreasureEntityId =
  | 'treasure-passage-document'
  | 'treasure-ward-key'
  | 'treasure-zhuque-token'
  | 'treasure-palace-standard'
  | 'treasure-gate-tally'
  | 'treasure-canal-rubbing'
  | 'treasure-ward-ledger'
  | 'treasure-archive-slip';
export type QuestEntityId = QuestNpcId | QuestTreasureEntityId;
export type TreasureId =
  | 'passage-document'
  | 'ward-key'
  | 'zhuque-token'
  | 'palace-standard'
  | 'gate-tally'
  | 'canal-rubbing'
  | 'ward-ledger'
  | 'archive-slip';
export type KnowledgeId =
  | 'silk-road-trade'
  | 'ward-curfew-order'
  | 'tang-roof-craft'
  | 'zhuque-ritual-traffic'
  | 'taiji-palace-ritual'
  | 'city-gate-defense'
  | 'urban-waterworks'
  | 'ward-household-registers'
  | 'palace-document-administration';

export interface HistoricalKnowledgeCard {
  id: KnowledgeId;
  title: string;
  summary: string;
  confirmed: string;
  interpretation: string;
  uncertain: string;
  sources: string[];
}

interface QuestEntityBase extends Point2 {
  id: QuestEntityId;
  name: string;
  role: string;
  triggerRadius: number;
}

export interface QuestNpc extends QuestEntityBase {
  kind: 'npc';
  id: QuestNpcId;
  dialogue: string[];
  knowledge: HistoricalKnowledgeCard;
}

export interface QuestTreasure extends QuestEntityBase {
  kind: 'treasure';
  id: QuestTreasureEntityId;
  treasureId: TreasureId;
  description: string;
  history: string;
}

export type QuestEntity = QuestNpc | QuestTreasure;

export interface QuestObjective {
  id: string;
  entityId: QuestEntityId;
  title: string;
  instruction: string;
}

export interface QuestChapter {
  id: QuestChapterId;
  numberLabel: string;
  title: string;
  subtitle: string;
  introduction: string;
  completionText: string;
  objectives: QuestObjective[];
}

export const questNpcs: QuestNpc[] = [
  {
    id: 'npc-sogdian-merchant',
    kind: 'npc',
    name: '阿罗罕',
    role: '西市胡商',
    x: -46,
    z: 0,
    triggerRadius: 6.5,
    dialogue: [
      '旅人，你若要在长安通行，光有货物可不够，还得证明自己从何处来、要往何处去。',
      '我的货签送到市署后，他们会核验度量与来路。沿中街向东南走，市署的人会告诉你下一步。'
    ],
    knowledge: {
      id: 'silk-road-trade',
      title: '丝路商旅与西市',
      summary: '外来商旅、物产与制度共同塑造了西市的跨地域气质。',
      confirmed: '墓志、文献与出土器物表明唐代长安聚居着来自中亚等地的人群，跨地域商品与文化在都城持续流动。',
      interpretation: '游戏把胡商设置在西市西门外侧与货栈入口附近，用一个合成角色串联身份、货物和市场管理，不指代真实历史人物。',
      uncertain: '某位胡商在公元 750 年具体售卖什么、住在哪座院落，目前不能由现有材料精确还原。',
      sources: ['荣新江《中古中国与外来文明》', 'Valerie Hansen, The Silk Road: A New History']
    }
  },
  {
    id: 'npc-ward-elder',
    kind: 'npc',
    name: '裴里正',
    role: '群贤坊里正',
    x: 46,
    z: 24,
    triggerRadius: 7,
    dialogue: [
      '坊门一闭，街上便不是白日的模样了。里正要登记住户，也要照看夜间出入。',
      '钥牌交给瓦作工匠保管了。他正在东面的宅院修屋檐，顺路看看普通人怎样在坊中生活吧。'
    ],
    knowledge: {
      id: 'ward-curfew-order',
      title: '坊门与夜禁',
      summary: '坊墙与坊门把城市管理落实到日常路线和昼夜节律。',
      confirmed: '考古与文献共同表明唐长安以道路、坊墙和坊门组织居住区，夜间通行受到制度约束。',
      interpretation: '游戏将里正放在坊门附近，并以钥牌作为任务物，帮助玩家理解空间边界与管理者的关系。',
      uncertain: '不同坊区在天宝年间的实际门禁执行强度、里正值守位置与钥牌样式并不完全清楚。',
      sources: ['《唐律疏议》相关夜禁条文', '徐松《唐两京城坊考》']
    }
  },
  {
    id: 'npc-roof-artisan',
    kind: 'npc',
    name: '鲁六郎',
    role: '瓦作工匠',
    x: 78,
    z: 48,
    triggerRadius: 7,
    dialogue: [
      '你看这屋顶，瓦垄要顺坡排下，屋脊和檐口既挡雨，也让院落有了清楚的轮廓。',
      '里正的钥牌就在井台边。拿去以后，沿大路向东，朱雀大街的巡吏还会查验你的通行凭证。'
    ],
    knowledge: {
      id: 'tang-roof-craft',
      title: '唐代屋顶与木构',
      summary: '台基、木柱、屋架、瓦顶和檐口共同构成建筑的层次。',
      confirmed: '唐代建筑遗存、壁画、陶屋和后世实物表明木构建筑通常结合台基、柱网、屋架与瓦顶。',
      interpretation: '普通坊区采用实例化坡屋顶、屋脊与木柱，追求可读的城市纹理，而不是逐栋复原真实宅院。',
      uncertain: '绝大多数长安民居的具体梁架、瓦色、门窗纹样和修缮状态无法逐栋确认。',
      sources: ['傅熹年《中国古代建筑史》', '唐代墓葬壁画与建筑明器研究']
    }
  },
  {
    id: 'npc-zhuque-patrol',
    kind: 'npc',
    name: '韩旅帅',
    role: '朱雀街巡吏',
    x: 194,
    z: 12,
    triggerRadius: 8,
    dialogue: [
      '这里是朱雀大街。它不仅宽阔，也把城市礼制、交通和皇城正门连在同一条轴线上。',
      '你的巡符在北段路标旁。取到后继续向北，承天门内的宫城礼仪与市井大不相同。'
    ],
    knowledge: {
      id: 'zhuque-ritual-traffic',
      title: '朱雀大街的城市中轴',
      summary: '道路尺度、方向和门阙共同表达都城秩序。',
      confirmed: '考古勘探与城市史研究确认朱雀大街是唐长安重要南北轴线，并通向皇城正门区域。',
      interpretation: '游戏强化道路中央带、排水和巡吏角色，让玩家通过移动直接感受中轴尺度与通行秩序。',
      uncertain: '公元 750 年特定时段的人流密度、巡逻路线、路面维护细节无法精确还原。',
      sources: ['中国社会科学院考古研究所唐长安城研究', 'Victor Cunrui Xiong, Sui-Tang Chang’an']
    }
  },
  {
    id: 'npc-palace-attendant',
    kind: 'npc',
    name: '高内谒',
    role: '宫城内侍',
    x: 194,
    z: 172,
    triggerRadius: 8,
    dialogue: [
      '入承天门后，行走不再只是找路，还要遵循朝会与宫城空间的礼序。',
      '这一阶段的仪仗牌在内廷园林。一路经过太极殿，你会看到前朝与内廷逐层分开的布局。'
    ],
    knowledge: {
      id: 'taiji-palace-ritual',
      title: '太极宫的礼仪空间',
      summary: '宫门、朝殿与内廷按照权力和礼仪形成递进层次。',
      confirmed: '文献与考古研究表明太极宫位于长安北部，承天门、太极殿等构成重要的宫城礼仪轴线。',
      interpretation: '游戏用连续院落、抬高殿宇和内侍引导表现礼仪递进，但建筑比例经过沙盘化压缩。',
      uncertain: '天宝年间不同仪式的具体路线、临时陈设、人员位置与园林植物配置仍有大量未知。',
      sources: ['《唐六典》', '傅熹年《中国古代城市规划、建筑群布局及建筑设计方法研究》']
    }
  },
  {
    id: 'npc-city-gate-guard',
    kind: 'npc',
    name: '杜门候',
    role: '南城门候',
    x: 194,
    z: -276,
    triggerRadius: 9,
    dialogue: [
      '都城南门不只是出入口。门道、城垣、守卫和验符制度共同控制着人、车与货物的进出。',
      '沿朱雀大街向北走，旧门籍的勘合木牌落在南段驿路旁，把它带回来便能核对今日出入记录。'
    ],
    knowledge: {
      id: 'city-gate-defense',
      title: '城门、城垣与都城防御',
      summary: '城门将交通、治安、军事防御与城市礼制集中在同一处节点。',
      confirmed: '考古勘探确认唐长安外郭城具有夯土城垣和多座城门，南面正门与朱雀大街共同构成重要城市轴线。',
      interpretation: '游戏把门候设置在南城中轴，并用勘合木牌串联城门查验、道路交通和守城制度，角色为历史情境中的合成人物。',
      uncertain: '公元 750 年某日的值守人数、验符程序、门楼修缮状态与具体出入名单无法由现有资料逐项复原。',
      sources: ['中国社会科学院考古研究所《唐长安城考古纪要》', '杨宽《中国古代都城制度史研究》']
    }
  },
  {
    id: 'npc-waterworks-clerk',
    kind: 'npc',
    name: '柳渠丞',
    role: '水渠巡检吏',
    x: 30,
    z: -164,
    triggerRadius: 8,
    dialogue: [
      '长安能容纳众多居民，靠的不只是井。城外来水、渠沟、涵洞与坊内用水一起维持日常生活。',
      '东面的路口留有一块渠槽拓片，上面记着修整尺寸。避开坊墙，沿大路去取回来。'
    ],
    knowledge: {
      id: 'urban-waterworks',
      title: '长安的井渠与城市用水',
      summary: '水渠、井、排水沟和道路系统共同支撑高密度都城的运转。',
      confirmed: '唐长安遗址发现水井、沟渠和排水设施，文献也记录引水渠道与城市水系，说明供水排水具有持续维护需求。',
      interpretation: '游戏把巡检吏与渠槽拓片放在南部坊区道路附近，以小型任务表现难以在沙盘远景中直接看见的基础设施网络。',
      uncertain: '具体渠线在天宝年间的流量、清淤周期、管理分工和每处涵洞结构仍存在许多研究空白。',
      sources: ['中国社会科学院考古研究所唐长安城水系研究', '辛德勇《隋唐两京丛考》']
    }
  },
  {
    id: 'npc-eastern-ward-scribe',
    kind: 'npc',
    name: '崔书佐',
    role: '东坊户籍书佐',
    x: 366,
    z: 60,
    triggerRadius: 8,
    dialogue: [
      '坊里的房屋看似相近，住户、租佃、迁徙和差役却都要落在簿籍里，城市秩序也由这些日常记录维系。',
      '北面路口遗落了一册坊户残簿。找到它，你就能看到宏大坊格背后的普通家庭。'
    ],
    knowledge: {
      id: 'ward-household-registers',
      title: '坊里、户籍与普通居民',
      summary: '规则坊格之内，是由家庭、邻里、租佃与基层管理组成的真实生活网络。',
      confirmed: '敦煌吐鲁番文书与唐代制度文献保存了户籍、手实和差役资料，显示国家通过基层记录掌握人口与财产信息。',
      interpretation: '游戏借东部普通坊区和户籍书佐展示非宫殿、非市场的日常城市，让玩家关注住宅纹理与基层行政。',
      uncertain: '长安某一坊在公元 750 年的住户名单、院落产权和具体职业构成无法从现存材料完整恢复。',
      sources: ['《唐六典》户部相关条目', '敦煌吐鲁番户籍文书研究']
    }
  },
  {
    id: 'npc-palace-archivist',
    kind: 'npc',
    name: '沈典籍',
    role: '宫城典籍吏',
    x: 214,
    z: 252,
    triggerRadius: 8,
    dialogue: [
      '宫城不仅有朝会和仪仗，也依赖诏令、奏抄、名籍与值宿记录。文书让庞大的机构能够连续运转。',
      '内廷东北夹道存着一枚封检木签。取回后，这条从市井、城门到宫城档案的线索就完整了。'
    ],
    knowledge: {
      id: 'palace-document-administration',
      title: '宫城文书与行政运转',
      summary: '诏令、奏抄、档案和封检制度是宫廷权力转化为日常行政的重要媒介。',
      confirmed: '唐代中央机构设有负责文书收发、编纂与保管的职官，敦煌吐鲁番文书也展现了成熟的官文书格式与流转习惯。',
      interpretation: '游戏以典籍吏和封检木签把宫殿空间与行政劳动联系起来，避免把宫城仅表现为静态纪念性建筑。',
      uncertain: '太极宫内具体档案库位置、天宝年间的保存规模以及这类木签的形制与文字内容仍不能精确确定。',
      sources: ['《唐六典》', '刘后滨《唐代中书门下体制研究》']
    }
  }
];

export const questTreasures: QuestTreasure[] = [
  {
    id: 'treasure-passage-document', kind: 'treasure', treasureId: 'passage-document', name: '盖印通关牒', role: '第一章线索',
    x: 4, z: -12, triggerRadius: 6, description: '一枚带市署印记的木牒，证明旅人的货物与身份已经核验。',
    history: '通关文书是游戏化合成线索，用来串联身份管理、市场制度和城市通行。'
  },
  {
    id: 'treasure-ward-key', kind: 'treasure', treasureId: 'ward-key', name: '坊门钥牌', role: '第二章线索',
    x: 94, z: 48, triggerRadius: 7, description: '坊门管理者交接使用的木牌，刻有里坊标记。',
    history: '钥牌的具体样式属于表现性设计，任务借它说明坊门、里正与夜间秩序。'
  },
  {
    id: 'treasure-zhuque-token', kind: 'treasure', treasureId: 'zhuque-token', name: '朱雀街巡符', role: '第三章线索',
    x: 194, z: 80, triggerRadius: 8, description: '巡吏交付的通行符，引导旅人进入皇城正门区域。',
    history: '巡符不是对具体出土物的复刻，而是帮助玩家理解中轴道路通行秩序的叙事道具。'
  },
  {
    id: 'treasure-palace-standard', kind: 'treasure', treasureId: 'palace-standard', name: '宫城仪仗牌', role: '第四章线索',
    x: 194, z: 276, triggerRadius: 9, description: '标记宫城仪仗次序的牌符，完成长安寻宝路线。',
    history: '仪仗牌为游戏化线索，用于串联前朝、内廷与宫廷礼仪知识。'
  },
  {
    id: 'treasure-gate-tally', kind: 'treasure', treasureId: 'gate-tally', name: '南门勘合牌', role: '第五章线索',
    x: 194, z: -220, triggerRadius: 9, description: '用于核对城门出入记录的合成木牌，上刻南门与日期标记。',
    history: '勘合牌为游戏化道具，借鉴古代符契与门籍制度，用于讲述都城入口的查验与治安。'
  },
  {
    id: 'treasure-canal-rubbing', kind: 'treasure', treasureId: 'canal-rubbing', name: '渠槽尺度拓片', role: '第六章线索',
    x: 78, z: -164, triggerRadius: 8, description: '记录渠槽宽深与修整痕迹的纸质拓片，边缘沾有泥沙。',
    history: '拓片内容为解释性设计，用来把水井、沟渠、涵洞与城市维护联系成可探索线索。'
  },
  {
    id: 'treasure-ward-ledger', kind: 'treasure', treasureId: 'ward-ledger', name: '东坊户籍残簿', role: '第七章线索',
    x: 366, z: 116, triggerRadius: 8, description: '一册残缺的坊户登记簿，记录家庭成员、迁入与差役信息。',
    history: '任务道具参考唐代户籍与手实文书的记录逻辑，但不复制任何一份具体出土文书。'
  },
  {
    id: 'treasure-archive-slip', kind: 'treasure', treasureId: 'archive-slip', name: '宫档封检木签', role: '第八章线索',
    x: 214, z: 268, triggerRadius: 8, description: '用于封缄与识别文书束的木签，残留朱墨标记。',
    history: '封检木签为合成线索，用于表现宫廷文书的收发、保管和行政流程。'
  }
];

export const questChapters: QuestChapter[] = [
  {
    id: 'market-passage', numberLabel: '第一章', title: '入市寻牒', subtitle: '在西市取得通行凭证',
    introduction: '从胡商与市署书吏处了解交易制度，找到盖印通关牒。', completionText: '通关牒已经收好，坊门之外还有更大的长安。',
    objectives: [
      { id: 'meet-merchant', entityId: 'npc-sogdian-merchant', title: '拜访西市胡商', instruction: '前往西市西门外侧开阔路面，与胡商阿罗罕交谈。' },
      { id: 'collect-document', entityId: 'treasure-passage-document', title: '取得盖印通关牒', instruction: '在市署附近找到发光的通关牒。' }
    ]
  },
  {
    id: 'ward-curfew', numberLabel: '第二章', title: '坊门夜禁', subtitle: '理解里坊生活的边界',
    introduction: '向里正询问坊门制度，再去拜访修缮宅院的瓦作工匠。', completionText: '坊门钥牌揭示了长安日常生活的昼夜节律。',
    objectives: [
      { id: 'meet-elder', entityId: 'npc-ward-elder', title: '询问坊门里正', instruction: '前往群贤坊门，与裴里正交谈。' },
      { id: 'meet-artisan', entityId: 'npc-roof-artisan', title: '拜访瓦作工匠', instruction: '向东进入普通坊区，寻找正在修屋的鲁六郎。' },
      { id: 'collect-ward-key', entityId: 'treasure-ward-key', title: '找到坊门钥牌', instruction: '在工匠东侧的井台附近寻找钥牌。' }
    ]
  },
  {
    id: 'zhuque-axis', numberLabel: '第三章', title: '朱雀中轴', subtitle: '沿礼制大道走向皇城',
    introduction: '沿东西街廊抵达朱雀大街，向巡吏了解都城中轴。', completionText: '朱雀街巡符为你打开了进入皇城中轴的路线。',
    objectives: [
      { id: 'meet-patrol', entityId: 'npc-zhuque-patrol', title: '寻找朱雀街巡吏', instruction: '抵达朱雀大街中央，与韩旅帅交谈。' },
      { id: 'collect-zhuque-token', entityId: 'treasure-zhuque-token', title: '取得朱雀街巡符', instruction: '沿朱雀大街向北，在皇城正门前找到巡符。' }
    ]
  },
  {
    id: 'palace-ritual', numberLabel: '第四章', title: '宫城礼仪', subtitle: '穿过前朝抵达内廷',
    introduction: '从承天门进入太极宫，循着内侍的指引完成宫城路线。', completionText: '宫城仪仗牌已经收好，更广阔的长安城仍等待勘察。',
    objectives: [
      { id: 'meet-attendant', entityId: 'npc-palace-attendant', title: '拜访宫城内侍', instruction: '进入承天门，与高内谒交谈。' },
      { id: 'collect-palace-standard', entityId: 'treasure-palace-standard', title: '找到宫城仪仗牌', instruction: '经过太极殿抵达内廷园林，寻找仪仗牌。' }
    ]
  },
  {
    id: 'southern-gate-survey', numberLabel: '第五章', title: '南门城防', subtitle: '沿朱雀大街勘察外郭城门',
    introduction: '从宫城折返长安南部，寻找门候并调查城垣、门籍与道路交通。', completionText: '南门勘合牌补全了都城入口的通行记录。',
    objectives: [
      { id: 'meet-city-gate-guard', entityId: 'npc-city-gate-guard', title: '拜访南城门候', instruction: '沿朱雀大街一直向南，在南城中轴找到杜门候。' },
      { id: 'collect-gate-tally', entityId: 'treasure-gate-tally', title: '寻找南门勘合牌', instruction: '从南门沿朱雀大街北行，在南段驿路旁找到勘合牌。' }
    ]
  },
  {
    id: 'canal-waterworks', numberLabel: '第六章', title: '井渠脉络', subtitle: '寻找长安地下与地表的水路',
    introduction: '拜访水渠巡检吏，沿南部坊区寻找水利设施留下的尺度记录。', completionText: '渠槽拓片揭示了宏大都城背后的供水与维护网络。',
    objectives: [
      { id: 'meet-waterworks-clerk', entityId: 'npc-waterworks-clerk', title: '寻找水渠巡检吏', instruction: '前往长安南部西侧道路，在路口找到柳渠丞。' },
      { id: 'collect-canal-rubbing', entityId: 'treasure-canal-rubbing', title: '取得渠槽尺度拓片', instruction: '沿东西道路向东，在下一个坊区路口寻找拓片。' }
    ]
  },
  {
    id: 'eastern-ward-life', numberLabel: '第七章', title: '东坊人家', subtitle: '走进普通居民的簿籍与生活',
    introduction: '穿过全城前往东部坊区，从户籍书佐处了解规则坊格中的家庭与基层管理。', completionText: '户籍残簿让普通居民重新出现在长安的城市叙事中。',
    objectives: [
      { id: 'meet-eastern-ward-scribe', entityId: 'npc-eastern-ward-scribe', title: '拜访东坊书佐', instruction: '前往长安东部坊区，在东西大路上寻找崔书佐。' },
      { id: 'collect-ward-ledger', entityId: 'treasure-ward-ledger', title: '找回东坊户籍残簿', instruction: '沿南北道路向北，在下一处十字路口寻找残簿。' }
    ]
  },
  {
    id: 'inner-palace-record', numberLabel: '第八章', title: '宫档遗签', subtitle: '追踪宫城文书的流转',
    introduction: '返回太极宫内廷，寻找典籍吏并完成连接市井、城防、坊里与宫城的最后档案。', completionText: '八件线索已经集齐，你完成了公元 750 年长安城的完整寻宝路线。',
    objectives: [
      { id: 'meet-palace-archivist', entityId: 'npc-palace-archivist', title: '寻找宫城典籍吏', instruction: '返回太极宫内廷，在两仪殿东侧道路找到沈典籍。' },
      { id: 'collect-archive-slip', entityId: 'treasure-archive-slip', title: '取得宫档封检木签', instruction: '沿内廷东侧道路向北，在园林夹道找到封检木签。' }
    ]
  }
];

export const questEntities: QuestEntity[] = [...questNpcs, ...questTreasures];
export const questEntityById = new Map(questEntities.map((entity) => [entity.id, entity]));
export const questChapterById = new Map(questChapters.map((chapter) => [chapter.id, chapter]));
export const treasureById = new Map(questTreasures.map((treasure) => [treasure.treasureId, treasure]));
export const knowledgeById = new Map(questNpcs.map((npc) => [npc.knowledge.id, npc.knowledge]));
