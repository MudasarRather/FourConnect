/*
  useIncidentPeek — per-row on-demand intel cache for the Critical desks.
  A row expand / hover-intent asks for the incident's phases, sitrep, similar
  precedents and response-task board in ONE settled fan-out; the result is
  cached per ticket for 60s so paging back and forth never re-fans. Every verb
  that mutates an incident should call invalidate(id) from its @done handler so
  the next peek is honest.

    const peekCache = useIncidentPeek()
    const intel = peekCache.peek(row.id)   // reactive { phases, sitrep, similar, tasks, loading }
    peekCache.prefetch(row.id)             // hover intent — warm the cache, no state needed
    peekCache.invalidate(row.id)           // after any verb @done

  Fetch failures degrade per-field (Promise.allSettled): a 404 on /tasks before
  the playbook backend lands simply leaves tasks null — the desk hides the block.
*/
import { reactive } from 'vue'
import {
  fetchIncidentPhases, fetchIncidentSitrep, similarIncidents, listIncidentTasks,
} from '@/composables/useSupportDesk'

const TTL_MS = 60_000

/* "Possible repeat" chip rule (plan C2): at least 2 terminal precedents with a
   match score of 3+ — derived client-side from /similar, no backend change. */
export const isPossibleRepeat = (similar) =>
  Array.isArray(similar) && similar.filter((s) => (s?.score ?? 0) >= 3).length >= 2

export function useIncidentPeek () {
  const cache = new Map()   // String(id) → { at, state, inflight }

  const fresh = (e) => e && (Date.now() - e.at) <= TTL_MS

  const entry = (id) => {
    const key = String(id)
    let e = cache.get(key)
    if (fresh(e)) return e
    e = {
      at: Date.now(),
      inflight: null,
      state: reactive({ phases: null, sitrep: null, similar: null, tasks: null, loading: false }),
    }
    cache.set(key, e)
    return e
  }

  const load = (id) => {
    const e = entry(id)
    if (e.inflight) return e.inflight
    if (e.loaded && fresh(e)) return Promise.resolve(e.state)
    e.state.loading = true
    e.inflight = Promise.allSettled([
      fetchIncidentPhases(id),
      fetchIncidentSitrep(id),
      similarIncidents(id),
      listIncidentTasks(id),
    ]).then(([phases, sitrep, similar, tasks]) => {
      if (phases.status === 'fulfilled') e.state.phases = phases.value
      if (sitrep.status === 'fulfilled') e.state.sitrep = sitrep.value
      if (similar.status === 'fulfilled') e.state.similar = similar.value
      if (tasks.status === 'fulfilled') e.state.tasks = tasks.value
      e.at = Date.now()          // TTL runs from settle, not from request
      e.loaded = true
      e.inflight = null
      e.state.loading = false
      return e.state
    })
    return e.inflight
  }

  /* Reactive read — kicks the fetch (or the TTL re-fetch) and hands back the
     live state object; templates just bind to its fields. */
  const peek = (id) => {
    const e = entry(id)
    load(id)
    return e.state
  }
  /* Hover-intent warmer — same fetch, nothing returned. */
  const prefetch = (id) => { load(id) }
  /* Called from every verb @done so the next peek reflects the mutation. */
  const invalidate = (id) => { cache.delete(String(id)) }

  return { peek, prefetch, invalidate }
}
