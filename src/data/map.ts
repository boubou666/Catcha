/**
 * The world map: the official Palpagos map from palworld.wiki.gg (public/map/world-2048.webp, with a 1024 px
 * version for the world view), and where every location sits on it. Coordinates are pixels in the 2048 × 2048
 * image; each region has a crop box the map zooms to and a label spot for the world view. Positions were
 * read off the map by hand — close enough to tell a coast from a peak, not survey-grade.
 */
export const MAP_SIZE = 2048;
export const MAP_IMAGE = { world: 'map/world-1024.webp', region: 'map/world-2048.webp' };

export interface RegionMapDef {
  regionId: string;
  box: [x: number, y: number, w: number, h: number];   // what the region view shows
  label: [number, number];                             // name position in the world view
  spots: Record<string, [number, number]>;             // route / alpha / tower / realm id → position
}

export const REGION_MAPS: RegionMapDef[] = [
  { regionId: 'windswept', box: [990, 430, 560, 760], label: [1270, 1170], spots: {
    plateau: [1230, 970], behemoth: [1120, 900], fort: [1085, 780], cove: [1340, 1010], bridge: [1290, 770], church: [1410, 890], icewind: [1310, 600],
    chillet: [1180, 880], penking: [1340, 650], rayne: [1290, 700], frozen_wings: [1370, 575],
    base: [1105, 1055], altar: [1300, 1080], scout: [1360, 930],
  } },
  { regionId: 'marsh', box: [860, 560, 400, 360], label: [1000, 905], spots: {
    seabreeze: [920, 730], marsh: [930, 660], bamboo: [1030, 630], ravine: [1125, 765], lake: [1175, 830], forest: [1080, 835], alliance: [1120, 730],
    grintale: [1030, 668], elizabee: [1150, 785], kingpaca: [1085, 745], lily: [1150, 700], invincible: [1060, 690], zealot: [1095, 690],
  } },
  { regionId: 'dunes', box: [1350, 180, 420, 470], label: [1560, 620], spots: {
    dunes: [1470, 540], oasis: [1520, 480], ruins: [1625, 545], pyre: [1480, 380], canyon: [1600, 300], crater: [1690, 420], brothers: [1560, 250],
    elphidran: [1450, 470], mammorest: [1610, 360], anubis: [1540, 590], axel: [1580, 240], swordmaster: [1700, 520], cultist: [1560, 470],
  } },
  { regionId: 'obsidian', box: [680, 760, 380, 420], label: [870, 1130], spots: {
    foothills: [960, 900], lava: [930, 980], nightpath: [850, 1050], caldera: [820, 950], furnace: [760, 1000], serpent: [800, 860], pidf: [880, 800],
    helzephyr: [900, 930], menasting: [780, 1080], blazamut: [1000, 1040], marcus: [860, 810], winged_tyrant: [940, 1090], trooper: [905, 985],
  } },
  { regionId: 'astral', box: [960, 200, 420, 400], label: [1150, 250], spots: {
    astral_foot: [1120, 540], frozen: [1060, 470], ridge: [1010, 380], glacier: [1080, 300], summit: [1150, 400], sanctuary: [1340, 225], genetics: [1250, 450],
    wumpo: [1030, 470], cryolinx: [1040, 330], frostallion: [1180, 340], victor: [1170, 265], pristine: [1265, 500], guard: [1100, 420],
  } },
  { regionId: 'sakurajima', box: [720, 400, 330, 260], label: [880, 395], spots: {
    rice: [900, 560], cedar: [965, 525], shrine: [830, 530], hotspring: [800, 585], dojo: [930, 480], crash: [850, 470], moonflower: [800, 480],
    knocklem: [920, 500], dogen: [860, 600], xenolord: [940, 590], saya: [860, 450], moonlit: [960, 585], warrior: [890, 520],
  } },
  { regionId: 'feybreak', box: [300, 1170, 600, 660], label: [560, 1250], spots: {
    shore: [740, 1230], wetlands: [640, 1330], ghostwood: [530, 1290], starfall: [600, 1470], embers: [710, 1560], terra: [480, 1420], peak: [420, 1630],
    omascul: [560, 1360], azurmane: [660, 1440], bellanoir: [520, 1700], bjorn: [760, 1300], starfall_realm: [470, 1560], marauder: [600, 1390],
  } },
];

export const regionMapById = (regionId: string): RegionMapDef => {
  const m = REGION_MAPS.find((x) => x.regionId === regionId);
  if (!m) throw new Error(`No map for ${regionId}`);
  return m;
};

/** Where a location sits; falls back to the region's centre so a new location never crashes the map. */
export function spotOf(regionId: string, id: string): [number, number] {
  const m = regionMapById(regionId);
  return m.spots[id] ?? [m.box[0] + m.box[2] / 2, m.box[1] + m.box[3] / 2];
}
