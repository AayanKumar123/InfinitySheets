import React, { useCallback, useEffect, useState } from 'react';
import { Users, Plus, LogIn, Copy, Loader2, Trophy, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../context/AppContext';
import * as store from '../../lib/dataStore';
import { track } from '../../lib/analytics';

// Study groups: create one, share the 6-letter code, join with a code, see
// the weekly leaderboard (first names only, questions answered this week).
export default function Groups() {
  const { state } = useApp();
  const isReal = !!(state.user && !state.user.isDemo && state.user.id);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(isReal);
  const [active, setActive] = useState(null);
  const [board, setBoard] = useState([]);
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!isReal) return;
    setLoading(true);
    try {
      const list = await store.myGroups();
      setGroups(list);
      setActive((cur) => cur && list.find((g) => g.id === cur.id) ? cur : list[0] || null);
    } catch (e) { toast.error(e.message || 'Could not load your groups'); }
    finally { setLoading(false); }
  }, [isReal]);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    if (!active) { setBoard([]); return; }
    store.groupLeaderboard(active.id).then(setBoard).catch(() => setBoard([]));
  }, [active]);

  const create = async () => {
    if (!name.trim()) { toast.error('Give the group a name'); return; }
    setBusy(true);
    try {
      const g = await store.createGroup(name.trim(), school.trim());
      toast.success(`Group created — share the code ${g.code}`);
      track('group_created');
      setName(''); setSchool('');
      await refresh();
    } catch (e) { toast.error(e.message || 'Could not create the group'); }
    finally { setBusy(false); }
  };
  const join = async () => {
    if (!code.trim()) return;
    setBusy(true);
    try {
      const g = await store.joinGroup(code.trim());
      if (!g) { toast.error('No group has that code'); return; }
      toast.success(`Joined ${g.name}`);
      track('group_joined');
      setCode('');
      await refresh();
    } catch (e) { toast.error(e.message || 'Could not join'); }
    finally { setBusy(false); }
  };
  const leave = async (g) => {
    if (!window.confirm(`Leave ${g.name}?`)) return;
    try { await store.leaveGroup(g.id, state.user.id); toast.success('Left the group'); await refresh(); }
    catch (e) { toast.error(e.message || 'Could not leave'); }
  };
  const copy = (c) => { navigator.clipboard?.writeText(c).then(() => toast.success('Code copied')).catch(() => toast(c)); };

  if (!isReal) {
    return (
      <div className="max-w-[820px]">
        <div className="rounded-2xl border border-dashed border-[color:var(--color-border)] p-10 text-center bg-slate-50/50" data-testid="groups-demo">
          <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <div className="text-[15px] font-semibold text-slate-800">Study groups need an account</div>
          <div className="text-[13px] text-slate-500 mt-1">Sign up, then create a group for your class and share its code. The leaderboard shows questions answered this week — first names only.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] flex flex-col gap-5">
      <p className="text-[14px] text-zinc-500">Practise with your class. Groups only ever show first names, this week's question count, accuracy and streak — never answers or emails.</p>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[color:var(--color-border)] bg-white p-5">
          <div className="text-[14px] font-semibold text-slate-900 inline-flex items-center gap-2 mb-3"><Plus className="w-4 h-4 text-violet-600" /> Create a group</div>
          <input className="input-base w-full mb-2" placeholder="Group name (e.g. 10B Physics)" value={name} onChange={(e) => setName(e.target.value)} data-testid="group-name" />
          <input className="input-base w-full mb-3" placeholder="School (optional)" value={school} onChange={(e) => setSchool(e.target.value)} />
          <button onClick={create} disabled={busy} className="btn-violet px-4 py-2 rounded-lg text-[13.5px] font-medium disabled:opacity-60" data-testid="group-create">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}</button>
        </div>
        <div className="rounded-2xl border border-[color:var(--color-border)] bg-white p-5">
          <div className="text-[14px] font-semibold text-slate-900 inline-flex items-center gap-2 mb-3"><LogIn className="w-4 h-4 text-emerald-600" /> Join with a code</div>
          <input className="input-base w-full mb-3 uppercase tracking-widest" placeholder="ABC123" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} data-testid="group-code" />
          <button onClick={join} disabled={busy || code.length < 6} className="btn-outline-dark px-4 py-2 rounded-lg text-[13.5px] font-medium disabled:opacity-60" data-testid="group-join">Join</button>
        </div>
      </div>

      {loading ? <div className="text-[13px] text-slate-500 inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading groups…</div> : groups.length === 0 ? (
        <div className="text-[13px] text-slate-500">You are not in a group yet.</div>
      ) : (
        <div className="grid lg:grid-cols-[280px_1fr] gap-4 items-start">
          <div className="flex flex-col gap-1.5" data-testid="group-list">
            {groups.map((g) => (
              <button key={g.id} onClick={() => setActive(g)} className={`text-left rounded-xl border px-3.5 py-2.5 ${active?.id === g.id ? 'border-violet-500 bg-violet-50' : 'border-[color:var(--color-border)] bg-white hover:bg-slate-50'}`}>
                <div className="text-[13.5px] font-semibold text-slate-900">{g.name}</div>
                <div className="text-[11.5px] text-slate-500">{g.school || 'No school set'} · code <span className="font-mono font-semibold text-slate-700">{g.code}</span></div>
              </button>
            ))}
          </div>
          {active && (
            <div className="rounded-2xl border border-[color:var(--color-border)] bg-white p-5" data-testid="leaderboard">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="text-[15px] font-semibold text-slate-900 inline-flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" /> {active.name} · this week</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => copy(active.code)} className="btn-outline-dark inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px]"><Copy className="w-3.5 h-3.5" /> {active.code}</button>
                  <button onClick={() => leave(active)} className="text-slate-400 hover:text-rose-600 inline-flex items-center gap-1 text-[12.5px]"><LogOut className="w-3.5 h-3.5" /> Leave</button>
                </div>
              </div>
              {board.length === 0 ? <div className="text-[13px] text-slate-500">No activity this week yet.</div> : (
                <table className="w-full text-[13px]">
                  <thead><tr className="text-[11px] uppercase tracking-wide text-slate-500 text-left"><th className="py-1.5">#</th><th>Name</th><th className="text-right">Questions</th><th className="text-right">Sheets</th><th className="text-right">Accuracy</th><th className="text-right">Streak</th></tr></thead>
                  <tbody>
                    {board.map((r, i) => (
                      <tr key={i} className={`border-t border-[color:var(--color-border)] ${r.me ? 'bg-violet-50/60 font-semibold' : ''}`}>
                        <td className="py-2">{i + 1}</td><td>{r.name}{r.me ? ' (you)' : ''}</td>
                        <td className="text-right tabular-nums">{r.questions}</td><td className="text-right tabular-nums">{r.sheets}</td>
                        <td className="text-right tabular-nums">{r.accuracy == null ? '—' : `${r.accuracy}%`}</td><td className="text-right tabular-nums">{r.streak}🔥</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
