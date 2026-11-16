/**
 * E2 : l'état de l'app ne perd et n'écrase jamais de données.
 * Le stockage est simulé en mémoire : on vérifie exactement ce qui est écrit, quand, et ce qui ne l'est pas.
 */
import { act, render, waitFor } from '@testing-library/react-native';
import { EMPTY, encode, STATE_KEY, type AppData } from '../../data/persist';
import type { Expense } from '../../domain/types';
import { AppStateProvider, CLEANED_KEY, forRestore, UNREADABLE_KEY, useAppState } from '../AppState';

const mockStore = new Map<string, string>();
const mockKv = {
  get: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  set: jest.fn(async (k: string, v: string) => { mockStore.set(k, v); }),
  wipe: jest.fn(async () => { mockStore.clear(); }),
};
// accesseur différé : jest place ce mock avant la déclaration de mockKv
jest.mock('../../data/kv', () => ({ get kv() { return mockKv; }, testFlag: () => null }));

let s: ReturnType<typeof useAppState>;
function Probe({ onState }: { onState: (v: ReturnType<typeof useAppState>) => void }) { onState(useAppState()); return null; }
const mount = async () => { await render(<AppStateProvider><Probe onState={v => { s = v; }} /></AppStateProvider>); };
const stored = (): AppData => JSON.parse(mockStore.get(STATE_KEY)!);
/** ce que l'app écrit pour ces données (avec le numéro de version du format) */
const asStored = (d: AppData) => JSON.parse(encode(d));
const stateWrites = () => mockKv.set.mock.calls.filter(([k]) => k === STATE_KEY).length;

const exp = (id: string, amount = 1000): Expense => ({ id, date: '2026-11-10', label: 'Marché', categoryId: 'courses', amount });
const PROFILE = { income: 248000, extraIncome: 0, payday: 1, savePct: 0.2, charges: [] };
const SEEDED: AppData = { ...EMPTY, profile: PROFILE, expenses: [exp('a')] };

beforeEach(() => {
  mockStore.clear();
  mockKv.get.mockReset().mockImplementation(async (k: string) => mockStore.get(k) ?? null);
  mockKv.set.mockReset().mockImplementation(async (k: string, v: string) => { mockStore.set(k, v); });
  mockKv.wipe.mockReset().mockImplementation(async () => { mockStore.clear(); });
});

describe('chargement', () => {
  test('aucune écriture tant que les données ne sont pas lues', async () => {
    mockStore.set(STATE_KEY, encode(SEEDED));
    let release!: () => void;
    const gate = new Promise<void>(r => { release = r; });
    mockKv.get.mockImplementation(async (k: string) => { await gate; return mockStore.get(k) ?? null; });
    await mount();
    expect(s.status).toBe('chargement');
    await act(() => s.savePrefs({ hideAmounts: true }));
    expect(mockKv.set).not.toHaveBeenCalled();
    expect(s.error).toMatch(/Rien n’a été enregistré/);
    await act(async () => { release(); });
    await waitFor(() => expect(s.status).toBe('ok'));
    expect(s.expenses).toEqual([exp('a')]);
    expect(stored()).toEqual(asStored(SEEDED)); // intact
  });

  test('stockage indisponible : statut « erreur », rien n’est écrit, même si on essaie', async () => {
    mockStore.set(STATE_KEY, encode(SEEDED));
    mockKv.get.mockRejectedValue(new Error('trousseau verrouillé'));
    await mount();
    await waitFor(() => expect(s.status).toBe('erreur'));
    await act(() => s.addExpense(exp('b')));
    await act(() => s.savePrefs({ theme: 'sombre' }));
    expect(mockKv.set).not.toHaveBeenCalled();
    expect(stored()).toEqual(asStored(SEEDED));
  });

  test('clé de chiffrement perdue : statut « illisible » (clé), aucune écriture', async () => {
    mockKv.get.mockRejectedValue(Object.assign(new Error('clé absente'), { code: 'KEY_LOST' }));
    await mount();
    await waitFor(() => expect(s.status).toBe('illisible'));
    expect(s.unreadableReason).toBe('cle');
    expect(mockKv.set).not.toHaveBeenCalled();
  });

  test('données illisibles : copie gardée à part, l’original n’est pas réécrit', async () => {
    mockStore.set(STATE_KEY, '{abîmé');
    await mount();
    await waitFor(() => expect(s.status).toBe('illisible'));
    expect(s.unreadableReason).toBe('fichier');
    expect(mockStore.get(UNREADABLE_KEY)).toBe('{abîmé');
    expect(mockStore.get(STATE_KEY)).toBe('{abîmé');
    expect(stateWrites()).toBe(0);
  });

  test('une copie illisible précédente, différente, n’est pas perdue', async () => {
    mockStore.set(UNREADABLE_KEY, '{ancien');
    mockStore.set(STATE_KEY, '{nouveau');
    await mount();
    await waitFor(() => expect(s.status).toBe('illisible'));
    expect(mockStore.get(UNREADABLE_KEY + '.ancien')).toBe('{ancien');
    expect(mockStore.get(UNREADABLE_KEY)).toBe('{nouveau');
  });

  test('élément abîmé écarté : l’original complet est gardé avant toute réécriture', async () => {
    const raw = JSON.stringify({ ...JSON.parse(encode(SEEDED)), expenses: [exp('a'), { ...exp('x'), amount: -5 }] });
    mockStore.set(STATE_KEY, raw);
    await mount();
    await waitFor(() => expect(s.status).toBe('ok'));
    expect(s.expenses.map(e => e.id)).toEqual(['a']);
    expect(mockStore.get(CLEANED_KEY)).toBe(raw);
  });

  test('démarrer de zéro n’est possible que depuis l’état « illisible »', async () => {
    mockStore.set(STATE_KEY, encode(SEEDED));
    await mount();
    await waitFor(() => expect(s.status).toBe('ok'));
    await act(() => s.startFresh());
    expect(stored()).toEqual(asStored(SEEDED));
  });
});

describe('écritures', () => {
  beforeEach(() => { mockStore.set(STATE_KEY, encode(SEEDED)); });

  test('ajout enregistré ; un double appui (même identifiant) n’ajoute rien', async () => {
    await mount();
    await waitFor(() => expect(s.status).toBe('ok'));
    await act(() => s.addExpense(exp('b')));
    await act(() => s.addExpense(exp('b')));
    expect(stored().expenses.map(e => e.id)).toEqual(['b', 'a']);
  });

  test('écritures rapprochées : enregistrées dans l’ordre, aucune perdue', async () => {
    await mount();
    await waitFor(() => expect(s.status).toBe('ok'));
    await act(async () => { const p1 = s.addExpense(exp('b')); const p2 = s.addExpense(exp('c')); const p3 = s.savePrefs({ hideAmounts: true }); await Promise.all([p1, p2, p3]); });
    expect(stored().expenses.map(e => e.id)).toEqual(['c', 'b', 'a']);
    expect(stored().prefs.hideAmounts).toBe(true);
  });

  test('échec d’écriture : message affiché, donnée gardée à l’écran, puis tout est enregistré à la réussite suivante', async () => {
    await mount();
    await waitFor(() => expect(s.status).toBe('ok'));
    mockKv.set.mockRejectedValueOnce(new Error('disque plein'));
    await act(() => s.addExpense(exp('b')));
    expect(s.error).toMatch(/Impossible d’enregistrer/);
    expect(s.expenses.map(e => e.id)).toEqual(['b', 'a']);
    expect(stored().expenses.map(e => e.id)).toEqual(['a']); // pas encore écrit
    await act(() => s.addExpense(exp('c')));
    expect(s.error).toBeNull();
    expect(stored().expenses.map(e => e.id)).toEqual(['c', 'b', 'a']);
  });

  test('suppression annulable : « Annuler » remet la dépense', async () => {
    await mount();
    await waitFor(() => expect(s.status).toBe('ok'));
    await act(() => s.removeExpense('a'));
    expect(stored().expenses).toEqual([]);
    await act(() => s.undoRemove());
    expect(stored().expenses).toEqual([exp('a')]);
  });

  test('tout supprimer : attend les écritures en cours, puis efface tout', async () => {
    await mount();
    await waitFor(() => expect(s.status).toBe('ok'));
    await act(async () => { const p = s.addExpense(exp('b')); await s.wipeAll(); await p; });
    expect(mockKv.wipe).toHaveBeenCalledTimes(1);
    expect(mockStore.size).toBe(0);
    expect(s.expenses).toEqual([]);
    expect(s.profile).toBeNull();
  });
});

describe('restauration', () => {
  test('forRestore : verrou, rappels et avis « verrou désactivé » propres à l’ancien téléphone sont retirés', () => {
    const d = forRestore({ ...SEEDED, prefs: { ...EMPTY.prefs, lock: true, alerts: true, hideAmounts: true, lockOff: { date: '2026-11-12' } } });
    expect(d.prefs).toMatchObject({ lock: false, alerts: false, hideAmounts: true });
    expect(d.prefs.lockOff).toBeUndefined();
    expect(d.expenses).toEqual(SEEDED.expenses);
  });

  test('replaceAll remplace tout et enregistre, même depuis l’état « illisible »', async () => {
    mockStore.set(STATE_KEY, '{abîmé');
    await mount();
    await waitFor(() => expect(s.status).toBe('illisible'));
    await act(() => s.replaceAll(forRestore(SEEDED)));
    expect(s.status).toBe('ok');
    expect(stored().expenses).toEqual(SEEDED.expenses);
    expect(mockStore.get(UNREADABLE_KEY)).toBe('{abîmé'); // la copie de l'ancien contenu reste
  });
});
