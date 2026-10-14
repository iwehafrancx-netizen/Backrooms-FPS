export const TEAM_COLORS = [
  { id: 'red', name: 'Red', hex: '#e2453c', wool: 30 },
  { id: 'blue', name: 'Blue', hex: '#3c6ee2', wool: 31 },
  { id: 'green', name: 'Green', hex: '#4fbf3a', wool: 32 },
  { id: 'yellow', name: 'Yellow', hex: '#f2cc2e', wool: 33 },
  { id: 'purple', name: 'Purple', hex: '#9b4fd8', wool: 34 },
  { id: 'orange', name: 'Orange', hex: '#f08a2a', wool: 35 },
  { id: 'cyan', name: 'Cyan', hex: '#2fc3c9', wool: 36 },
  { id: 'pink', name: 'Pink', hex: '#ef7fb8', wool: 37 },
];

const B = [];
const def = (id, name, tex, o = {}) => {
  const t = typeof tex === 'string' ? { top: tex, side: tex, bottom: tex } : tex;
  B[id] = { id, name, tex: t, solid: o.solid !== false, transparent: !!o.transparent, cross: !!o.cross, hardness: o.hardness ?? 1, tool: o.tool || 'pick', unbreakable: !!o.unbreakable, light: o.light || 0, sound: o.sound || 'stone', color: o.color || '#888', invisible: !!o.invisible };
};

def(1, 'Grass', { top: 'grass_top', side: 'grass_side', bottom: 'dirt' }, { hardness: 0.6, tool: 'shovel', sound: 'grass', color: '#5fa83a' });
def(2, 'Dirt', 'dirt', { hardness: 0.5, tool: 'shovel', sound: 'gravel', color: '#8a5a36' });
def(3, 'Stone', 'stone', { hardness: 1.5, sound: 'stone', color: '#8c8c8c' });
def(4, 'Cobblestone', 'cobble', { hardness: 2, sound: 'stone', color: '#7a7a7a' });
def(5, 'Planks', 'planks', { hardness: 1.2, tool: 'axe', sound: 'wood', color: '#b4874c' });
def(6, 'Log', { top: 'log_top', side: 'log_side', bottom: 'log_top' }, { hardness: 1.6, tool: 'axe', sound: 'wood', color: '#6b4a2b' });
def(7, 'Leaves', 'leaves', { hardness: 0.2, transparent: true, tool: 'none', sound: 'grass', color: '#3f8f2a' });
def(8, 'Sand', 'sand', { hardness: 0.5, tool: 'shovel', sound: 'sand', color: '#e3d394' });
def(9, 'Sandstone', { top: 'sandstone_top', side: 'sandstone_side', bottom: 'sandstone_top' }, { hardness: 0.9, sound: 'stone', color: '#d8c47e' });
def(10, 'Snow', { top: 'snow', side: 'snow_side', bottom: 'dirt' }, { hardness: 0.4, tool: 'shovel', sound: 'snow', color: '#f2f6fa' });
def(11, 'Ice', 'ice', { hardness: 0.5, transparent: true, sound: 'glass', color: '#a9d4f5' });
def(12, 'Glass', 'glass', { hardness: 0.3, transparent: true, tool: 'none', sound: 'glass', color: '#cfe8f2' });
def(13, 'Obsidian', 'obsidian', { hardness: 12, sound: 'stone', color: '#231a33' });
def(14, 'Gold Block', 'gold_block', { hardness: 3, sound: 'metal', color: '#f5cf3d' });
def(15, 'Iron Block', 'iron_block', { hardness: 3, sound: 'metal', color: '#d8d8d8' });
def(16, 'Diamond Block', 'diamond_block', { hardness: 3, sound: 'metal', color: '#5fe0d8' });
def(17, 'Chest', { top: 'chest_top', side: 'chest_side', bottom: 'chest_top' }, { hardness: 1.5, tool: 'axe', sound: 'wood', unbreakable: true, color: '#9a6a32' });
def(18, 'Basalt', { top: 'basalt_top', side: 'basalt_side', bottom: 'basalt_top' }, { hardness: 1.4, sound: 'stone', color: '#3e3c42' });
def(19, 'Magma', 'magma', { hardness: 1, sound: 'stone', light: 1, color: '#c8501e' });
def(20, 'Moonstone', 'moonstone', { hardness: 2, sound: 'stone', color: '#efe9b8' });
def(21, 'Bricks', 'bricks', { hardness: 2, sound: 'stone', color: '#a1503a' });
def(22, 'Terracotta', 'terracotta', { hardness: 1.3, sound: 'stone', color: '#b06a48' });
def(23, 'Core', 'core', { unbreakable: true, sound: 'stone', color: '#2a2a30' });
def(24, 'Iron Ore', 'iron_ore', { unbreakable: true, sound: 'stone', color: '#9a8a80' });
def(25, 'Gold Ore', 'gold_ore', { unbreakable: true, sound: 'stone', color: '#a69a60' });
def(26, 'Diamond Ore', 'diamond_ore', { unbreakable: true, sound: 'stone', color: '#7fa6a8' });
def(27, 'Lantern', 'lantern', { hardness: 0.5, sound: 'metal', light: 1, color: '#ffd27a' });
def(28, 'Mossy Stone', 'mossy', { hardness: 1.5, sound: 'stone', color: '#6f8a5a' });
def(29, 'Pumpkin', { top: 'pumpkin_top', side: 'pumpkin_side', bottom: 'pumpkin_top' }, { hardness: 1, tool: 'axe', sound: 'wood', color: '#e08a1e' });
for (const t of TEAM_COLORS) def(t.wool, `${t.name} Wool`, `wool_${t.id}`, { hardness: 0.35, tool: 'shears', sound: 'cloth', color: t.hex });
def(38, 'White Wool', 'wool_white', { hardness: 0.35, tool: 'shears', sound: 'cloth', color: '#eeeeee' });
def(40, 'Tall Grass', 'tallgrass', { solid: false, cross: true, hardness: 0, tool: 'none', sound: 'grass', transparent: true, color: '#6bbf3a' });
def(41, 'Red Flower', 'flower_red', { solid: false, cross: true, hardness: 0, tool: 'none', sound: 'grass', transparent: true, color: '#e23c3c' });
def(42, 'Yellow Flower', 'flower_yellow', { solid: false, cross: true, hardness: 0, tool: 'none', sound: 'grass', transparent: true, color: '#f2d22e' });
def(43, 'Dead Bush', 'deadbush', { solid: false, cross: true, hardness: 0, tool: 'none', sound: 'grass', transparent: true, color: '#8a6a3a' });
def(44, 'Cactus', { top: 'cactus_top', side: 'cactus_side', bottom: 'cactus_top' }, { hardness: 0.4, tool: 'none', sound: 'cloth', color: '#4f8a2a' });

def(45, 'Egg', 'core', { invisible: true, transparent: true, hardness: 1.2, tool: 'none', sound: 'egg', color: '#c86ae0' });
def(46, 'Barrier', 'glass', { invisible: true, transparent: true, unbreakable: true, sound: 'glass', color: '#ffffff' });

export const BLOCKS = B;
export const AIR = 0;
export const isSolid = (id) => id !== 0 && B[id] && B[id].solid;
export const isOpaque = (id) => id !== 0 && B[id] && B[id].solid && !B[id].transparent;
export const blockName = (id) => (B[id] ? B[id].name : 'Air');
