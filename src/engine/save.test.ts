import { describe, expect, it } from 'vitest';
import { newState } from './save';
describe('save codes', () => {
  it('round-trip through a compact gzip code, and still read plain export strings', async () => {
    const { encodeSaveCode, decodeSaveCode, exportSave } = await import('./save');
    const s = newState();
    s.player.gold = 1234; s.inventory.wood = 7;
    const code = await encodeSaveCode(s);
    expect(code.startsWith('catcha1.')).toBe(true);
    expect(code.length).toBeLessThan(exportSave(s).length);
    const back = (await decodeSaveCode(code))!;
    expect(back.player.gold).toBe(1234);
    expect(back.inventory.wood).toBe(7);
    expect((await decodeSaveCode(exportSave(s)))!.player.gold).toBe(1234);
    expect(await decodeSaveCode('catcha1.not-a-code')).toBeNull();
    expect(await decodeSaveCode('garbage')).toBeNull();
  });
});
