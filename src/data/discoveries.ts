export type DiscoveryId =
  | 'west-gate'
  | 'market-office'
  | 'sogdian-inn'
  | 'temple-quarter'
  | 'ward-gate'
  | 'zhuque-gate'
  | 'imperial-offices'
  | 'chengtian-gate'
  | 'taiji-hall'
  | 'inner-palace-garden'
  | 'mingde-gate-axis'
  | 'city-wall-rampart'
  | 'canal-culvert'
  | 'well-yard'
  | 'east-ward-residence'
  | 'roof-tile-kiln-trace'
  | 'palace-archive-court'
  | 'imperial-service-lane';

export interface DiscoveryCard {
  id: DiscoveryId;
  indexLabel: string;
  title: string;
  subtitle: string;
  guide: string;
  evidence: {
    confirmed: string;
    interpretation: string;
    uncertain: string;
  };
  sources: string[];
}

export const discoveries: DiscoveryCard[] = [
  {
    id: 'west-gate',
    indexLabel: '壹',
    title: '西市西门',
    subtitle: '商旅抵达长安的城市界面',
    guide:
      '从西面进入市场，眼前不是一片随意生长的街巷，而是受到城坊与市场制度共同约束的交易空间。',
    evidence: {
      confirmed:
        '唐长安设置东、西两座主要市场，西市位于皇城西南方向。考古与文献共同支持市场具有明确边界、街道和出入口。',
      interpretation:
        '沙盘把西门做成醒目的门楼，并将商旅车马集中在门外，用来帮助玩家理解“抵达市场”的空间体验。',
      uncertain:
        '西门在公元 750 年的具体立面、装饰颜色和门外设施缺乏足够材料，本模型不主张精确复原。'
    },
    sources: [
      '徐松《唐两京城坊考》',
      'Victor Cunrui Xiong, Sui-Tang Chang’an: A Study in the Urban History of Medieval China'
    ]
  },
  {
    id: 'market-office',
    indexLabel: '贰',
    title: '市署与交易街',
    subtitle: '被管理的繁华',
    guide:
      '唐代市场不仅是买卖发生的地方，也受到官府管理。价格、度量、开闭市与交易秩序都有制度痕迹。',
    evidence: {
      confirmed:
        '《唐六典》等制度文献记载了市署及市场官员的职责，说明官方市场存在管理机构与交易规则。',
      interpretation:
        '模型将一座较规整的院落标为管理与公共交易空间，以可读的建筑层级表现制度中心，但不对应已确认的单体平面。',
      uncertain:
        '西市市署在天宝年间的精确位置、院落尺寸与内部功能分配仍不能由当前原型确定。'
    },
    sources: ['《唐六典》卷二十', '徐松《唐两京城坊考》']
  },
  {
    id: 'sogdian-inn',
    indexLabel: '叁',
    title: '胡商旅舍',
    subtitle: '丝路网络在城市中的落点',
    guide:
      '西市常被视为长安对外贸易与多元人口活动的重要舞台。这里用一组旅舍和货栈讲述跨地域商旅，而不是虚构某位具体商人。',
    evidence: {
      confirmed:
        '墓志、传世文献与物质文化研究显示，唐代长安生活着来自中亚等地的人群，西市与跨地域商品流通关系密切。',
      interpretation:
        '沙盘以围合院落、货包和驼队构成“胡商旅舍”场景，这是对商旅活动的概括性表达。',
      uncertain:
        '该位置是否曾有专门旅舍、居住者族属以及公元 750 年某一天的具体商品构成均无直接证据。'
    },
    sources: [
      '荣新江《中古中国与外来文明》',
      'Valerie Hansen, The Silk Road: A New History'
    ]
  },
  {
    id: 'temple-quarter',
    indexLabel: '肆',
    title: '宗教交流点',
    subtitle: '信仰随人群进入长安',
    guide:
      '商旅带来的不只是货物。佛教与来自中亚、西亚的多种信仰，共同构成长安复杂的精神与社群景观。',
    evidence: {
      confirmed:
        '唐长安拥有数量众多的佛寺，也有外来宗教活动的文献记录；商业、侨民社群与宗教传播彼此关联。',
      interpretation:
        '模型用一处带塔院落代表“宗教交流点”，让玩家感知市场周边可能存在的宗教与社群网络。',
      uncertain:
        '此处不对应一座已被确认的具体寺院；建筑宗派、塔形和院落朝向均属于表现性复原。'
    },
    sources: [
      '徐松《唐两京城坊考》',
      'Edward H. Schafer, The Golden Peaches of Samarkand'
    ]
  },
  {
    id: 'ward-gate',
    indexLabel: '伍',
    title: '坊墙与坊门',
    subtitle: '日常生活的空间节律',
    guide:
      '长安街道把城市切分成规则坊区。坊墙与坊门让通行具有边界，也把昼夜秩序具体落实到人的路线中。',
    evidence: {
      confirmed:
        '考古与文献都表明唐长安采用道路、坊墙与坊门组织居住区；夜间通行受到制度限制。',
      interpretation:
        '沙盘保留一段完整坊墙和门道，并让旅行者只能从门中通过，以游戏规则呈现空间管理。',
      uncertain:
        '坊门实际开闭执行会受时期、地点与社会情境影响，不能把制度条文理解为每天完全一致的城市生活。'
    },
    sources: [
      '《唐律疏议·卫禁》',
      'Charles D. Benn, China’s Golden Age: Everyday Life in the Tang Dynasty'
    ]
  },
  {
    id: 'zhuque-gate',
    indexLabel: '陆',
    title: '皇城朱雀门',
    subtitle: '朱雀大街进入皇城的门阙',
    guide:
      '沿朱雀大街向北，城市的商业与坊里秩序逐渐转入国家礼仪空间。门前开阔地、御道和门楼共同制造了身份与权力的边界。',
    evidence: {
      confirmed:
        '唐长安皇城位于宫城之南，朱雀门是皇城南面重要入口，朱雀大街由此形成全城最重要的南北礼仪轴线。',
      interpretation:
        '模型用宽阔门楼、门前石铺广场与成列旗幡表现进入皇城时的尺度变化，门洞保持开放以支持连续漫游。',
      uncertain:
        '天宝年间朱雀门的具体彩画、屋顶构件、门前陈设和日常警卫人数没有足够材料支持逐项复原。'
    },
    sources: ['徐松《唐两京城坊考》', '杨宽《中国古代都城制度史研究》']
  },
  {
    id: 'imperial-offices',
    indexLabel: '柒',
    title: '皇城官署',
    subtitle: '王朝行政运作的院落网络',
    guide:
      '皇城不是单一宫殿，而是由中央官署、院墙、门道和交通轴线构成的行政区域。规则院落让国家机构在城市空间中获得清晰位置。',
    evidence: {
      confirmed:
        '隋唐长安皇城集中布置中央官署，制度文献与都城研究均说明其具有严格的空间等级和机构分区。',
      interpretation:
        '沙盘以东西对称的多进院落概括皇城官署，通过低于宫城正殿的台基和屋顶尺度表达行政与宫廷空间的等级差。',
      uncertain:
        '本模型未把每座建筑对应到公元 750 年某一具体衙署，院落内部房间分工与陈设属于概括性表达。'
    },
    sources: ['《唐六典》', 'Victor Cunrui Xiong, Sui-Tang Chang’an']
  },
  {
    id: 'chengtian-gate',
    indexLabel: '捌',
    title: '承天门',
    subtitle: '皇城与宫城之间的礼仪门庭',
    guide:
      '承天门把皇城官署与太极宫前朝连接起来。门楼、宫墙和门前广场使通行从城市道路转变为受礼仪控制的进宫路线。',
    evidence: {
      confirmed:
        '太极宫位于长安城北部，承天门是其南面正门之一，也是早唐重要的政治礼仪场所。',
      interpretation:
        '模型将承天门做成三段式高门楼并保留中央门洞，东西宫墙和旗列进一步强化宫城入口的轴线感。',
      uncertain:
        '承天门在天宝年间的修缮状态、构件尺寸、彩画方案以及特定仪式当天的布置仍需更细致的考古和文献互证。'
    },
    sources: ['《旧唐书》', '傅熹年《中国古代建筑史·两晋南北朝隋唐五代建筑》']
  },
  {
    id: 'taiji-hall',
    indexLabel: '玖',
    title: '太极殿前朝',
    subtitle: '宫城正殿与大朝空间',
    guide:
      '跨过承天门后，开阔庭院将视线引向高台上的太极殿。殿堂、台阶、石栏与东西廊庑共同形成面向国家大礼的空间。',
    evidence: {
      confirmed:
        '太极殿是太极宫中轴上的重要正殿，与唐初朝会和国家礼仪密切相关；宫殿建筑强调中轴、台基与前庭。',
      interpretation:
        '复原以高台、宽面阔殿身、重层屋顶和规整石铺庭院突出正殿等级，并用仪仗人物帮助玩家感受尺度。',
      uncertain:
        '玄宗时期政治活动重心已发生变化，太极殿在公元 750 年的具体使用频率、室内陈设和外檐彩画不能由本原型确定。'
    },
    sources: ['《唐会要》', '王贵祥《隋唐长安城宫殿建筑研究》']
  },
  {
    id: 'inner-palace-garden',
    indexLabel: '拾',
    title: '两仪殿与内廷园林',
    subtitle: '从前朝礼仪转入宫廷生活',
    guide:
      '越过太极殿，空间逐渐收束。两仪殿、翼殿、宫墙夹道、树木与水池将宏大的前朝转化为更私密的内廷环境。',
    evidence: {
      confirmed:
        '两仪殿位于太极宫中轴后部，是宫廷活动的重要建筑；宫城内部还包含居住、园林和服务性空间。',
      interpretation:
        '模型用较低的殿堂、围合院落、亭阁、树阵和浅水池表现内廷层次，让玩家能够从中轴进入两侧夹道与园林。',
      uncertain:
        '水池与亭阁的位置、植物种类、院落边界及天宝时期具体生活场景均为体验导向的复原，不代表精确遗址平面。'
    },
    sources: ['徐松《唐两京城坊考》', '宿白《隋唐长安城和洛阳城》']
  },
  {
    id: 'mingde-gate-axis',
    indexLabel: '拾壹',
    title: '南城正门轴线',
    subtitle: '外郭城门与朱雀大街的起点',
    guide: '站在长安南端向北望，城门、朱雀大街和皇城正门构成连续轴线，展示都城规划如何把交通与礼制组织在一起。',
    evidence: {
      confirmed: '考古与都城研究确认唐长安南面正门明德门位于朱雀大街南端，是外郭城规模宏大的重要门址。',
      interpretation: '当前沙盘以简化南门楼和开阔轴线表达入城尺度，重点呈现道路方向与城门位置关系。',
      uncertain: '门楼上部木构、彩画、门扇细节和天宝时期门前设施不能由现有模型精确还原。'
    },
    sources: ['中国社会科学院考古研究所《唐长安城明德门遗址发掘简报》', '杨宽《中国古代都城制度史研究》']
  },
  {
    id: 'city-wall-rampart',
    indexLabel: '拾贰',
    title: '外郭城垣',
    subtitle: '夯土边界与城市防御',
    guide: '长安城垣既划定城市范围，也与城门、巡防和交通管理共同作用。墙体的连续性让都城成为清晰可辨的政治空间。',
    evidence: {
      confirmed: '唐长安外郭城以夯土城垣围合，考古工作确认了多段墙基、城门与相关道路遗迹。',
      interpretation: '沙盘用连续厚墙和墙顶构件强化城市边界，但高度和细部经过微缩模型化处理。',
      uncertain: '天宝年间不同地段的残损、修补、附属木构和巡防设施尚难逐段恢复。'
    },
    sources: ['中国社会科学院考古研究所唐长安城考古资料', '宿白《隋唐长安城和洛阳城》']
  },
  {
    id: 'canal-culvert',
    indexLabel: '拾叁',
    title: '坊间渠沟与涵洞',
    subtitle: '藏在街道下的城市水脉',
    guide: '道路不仅承载车马，也需要跨越或容纳水渠。沟渠、涵洞与排水设施让庞大城市能够应对供水和降雨。',
    evidence: {
      confirmed: '长安遗址与相关研究发现水渠、排水沟和涵洞遗迹，城市水系与道路、坊区存在密切关系。',
      interpretation: '游戏把难以远距离看见的渠沟浓缩为道路边的考古点，并用拓片任务提示其工程属性。',
      uncertain: '该游戏坐标不对应一处已确认的具体涵洞，断面尺寸、材料与水流方向属于解释性设置。'
    },
    sources: ['唐长安城水系考古研究', '辛德勇《隋唐两京丛考》']
  },
  {
    id: 'well-yard',
    indexLabel: '拾肆',
    title: '坊内井台',
    subtitle: '居民日常取水的公共节点',
    guide: '井台把城市基础设施带回日常生活。取水、洗涤、交谈和邻里关系，都可能围绕一处小尺度空间展开。',
    evidence: {
      confirmed: '唐长安遗址发现数量众多的水井，井圈材料和结构多样，说明井水是坊内生活的重要水源。',
      interpretation: '普通坊区以井台和周边生活物件表现共享用水场景，位置服务于游览路线而非遗址复位。',
      uncertain: '单口井的使用者范围、清洁方式、具体水质与公元 750 年的维护状态通常难以确定。'
    },
    sources: ['唐长安城居住区考古资料', 'Charles D. Benn, China’s Golden Age']
  },
  {
    id: 'east-ward-residence',
    indexLabel: '拾伍',
    title: '东部普通宅院',
    subtitle: '坊格之中的家庭与邻里',
    guide: '离开市场和宫殿后，成片住宅才是大多数居民生活的长安。院落、巷道、井台和树木共同构成城市的日常纹理。',
    evidence: {
      confirmed: '考古与文献表明坊内包含住宅、寺观、作坊等多种空间，居民身份与宅院规模存在明显差异。',
      interpretation: '模型通过重复但有变化的院落组团表达高密度住宅区，并用户籍任务引导玩家关注普通人。',
      uncertain: '当前东坊建筑不对应具体历史住户，各院落的产权、人口和室内功能均为概括性表达。'
    },
    sources: ['徐松《唐两京城坊考》', '敦煌吐鲁番户籍文书研究']
  },
  {
    id: 'roof-tile-kiln-trace',
    indexLabel: '拾陆',
    title: '瓦当与修缮痕迹',
    subtitle: '从建筑构件观察城市更新',
    guide: '屋顶并非建成后永久不变。破损瓦片、替换构件和施工痕迹提示我们，长安一直需要工匠持续维护。',
    evidence: {
      confirmed: '长安城及唐代遗址出土大量瓦当、板瓦、筒瓦等建筑构件，不同纹样与制作痕迹可用于研究建筑年代和等级。',
      interpretation: '考古点以散落构件和修缮场景概括材料循环，不宣称这里就是一座已确认的窑址。',
      uncertain: '构件的原建筑、烧造地点、运输路线与某次修缮事件之间通常难以建立一一对应。'
    },
    sources: ['唐代建筑瓦作考古研究', '傅熹年《中国古代建筑史》']
  },
  {
    id: 'palace-archive-court',
    indexLabel: '拾柒',
    title: '宫城文书院落',
    subtitle: '权力背后的档案劳动',
    guide: '朝会之外，大量文书需要起草、抄录、封缄、传递和保存。宫城也包含支撑行政运作的安静工作空间。',
    evidence: {
      confirmed: '唐代中央机构设有承担文书与档案职责的职官，官文书具有较成熟的格式和流转制度。',
      interpretation: '沙盘借内廷侧院和典籍吏任务表现行政劳动，院落名称与位置属于体验导向的合成。',
      uncertain: '太极宫内实际档案库的精确位置、建筑尺度和天宝年间藏档数量仍缺乏直接复原依据。'
    },
    sources: ['《唐六典》', '刘后滨《唐代中书门下体制研究》']
  },
  {
    id: 'imperial-service-lane',
    indexLabel: '拾捌',
    title: '内廷夹道',
    subtitle: '宏大宫殿背后的服务路线',
    guide: '中轴用于展现礼仪，侧面的夹道则承担人员、物资与文书流动。两类路线共同维持宫廷空间的实际运转。',
    evidence: {
      confirmed: '大型宫殿群通常由中轴殿院、侧院、廊庑、门道和服务空间共同构成，通行具有等级与功能差异。',
      interpretation: '模型在内廷两侧保留可漫游道路，并把封检木签放在东侧夹道，引导玩家偏离主轴观察宫城。',
      uncertain: '游戏中的夹道宽度、门禁方式、使用人群和物资路线不代表天宝时期某条具体道路的精确复原。'
    },
    sources: ['王贵祥《隋唐长安城宫殿建筑研究》', '傅熹年《中国古代建筑史》']
  }
];

export const discoveryById = new Map(discoveries.map((discovery) => [discovery.id, discovery]));
