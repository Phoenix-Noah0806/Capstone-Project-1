import { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import { apiRequest } from "../api/client";
import { useAuth } from "./AuthContext";

const GameContext = createContext(null);

const initialState = {
  mission: {
    status: "idle",
    name: "",
    description: "",
    timerSeconds: 0,
    startedAt: null,
    progress: 0,
    stage: 0,
    score: 0,
    hintHolders: [],
    type: "free"
  },
  roles: [],
  scoreboard: [],
  missionHistory: [],
  reactions: [],
  votes: [],
  voteTally: {},
  cursorMap: {},
  xpPopups: [],
  confettiActive: false
};

let xpIdCounter = 0;

function reducer(state, action) {
  switch (action.type) {
    case "SET_STATE":
      return { ...state, ...action.payload };
    case "MISSION":
      return { ...state, mission: { ...state.mission, ...action.payload } };
    case "ROLES":
      return { ...state, roles: action.payload };
    case "SCORE": {
      const newPopup = {
        id: `xp-${++xpIdCounter}`,
        xp: action.payload.delta || (action.payload.score - (state.mission.score || 0)) || 5,
        ts: Date.now()
      };
      return {
        ...state,
        mission: { ...state.mission, score: action.payload.score },
        scoreboard: action.payload.scoreboard || state.scoreboard,
        xpPopups: [...state.xpPopups.slice(-4), newPopup]
      };
    }
    case "REACTION":
      return { ...state, reactions: [...state.reactions.slice(-20), action.payload] };
    case "VOTE": {
      const tally = { ...state.voteTally };
      tally[action.payload.vote] = (tally[action.payload.vote] || 0) + 1;
      return { ...state, votes: [...state.votes, action.payload], voteTally: tally };
    }
    case "VOTE_RESET":
      return { ...state, votes: [], voteTally: {} };
    case "CURSOR":
      return {
        ...state,
        cursorMap: { ...state.cursorMap, [action.payload.userId]: action.payload }
      };
    case "CONFETTI":
      return { ...state, confettiActive: action.payload };
    case "XP_POPUP_REMOVE":
      return { ...state, xpPopups: state.xpPopups.filter((p) => p.id !== action.payload) };
    case "MISSION_HISTORY":
      return { ...state, missionHistory: action.payload || [] };
    default:
      return state;
  }
}

export const GameProvider = ({ children }) => {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(reducer, initialState);

  const actions = useMemo(
    () => ({
      setFromSocket(payload) {
        dispatch({ type: "SET_STATE", payload });
        if (payload.missionHistory) {
          dispatch({ type: "MISSION_HISTORY", payload: payload.missionHistory });
        }
      },
      setMission(payload) {
        dispatch({ type: "MISSION", payload });
      },
      setRoles(payload) {
        dispatch({ type: "ROLES", payload });
      },
      pushReaction(payload) {
        dispatch({ type: "REACTION", payload });
      },
      pushVote(payload) {
        dispatch({ type: "VOTE", payload });
      },
      resetVotes() {
        dispatch({ type: "VOTE_RESET" });
      },
      updateScore(payload) {
        dispatch({ type: "SCORE", payload });
      },
      updateCursor(payload) {
        dispatch({ type: "CURSOR", payload });
      },
      triggerConfetti(active) {
        dispatch({ type: "CONFETTI", payload: active });
      },
      removeXPPopup(id) {
        dispatch({ type: "XP_POPUP_REMOVE", payload: id });
      },
      async startMission(roomId, mission) {
        return apiRequest(`/api/rooms/${roomId}/mission/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mission)
        });
      },
      async updateMission(roomId, updates) {
        return apiRequest(`/api/rooms/${roomId}/mission/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates)
        });
      },
      async setRolesApi(roomId, assignments) {
        return apiRequest(`/api/rooms/${roomId}/roles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignments })
        });
      }
    }),
    [user]
  );

  // Auto-remove XP popups after 2 seconds
  useEffect(() => {
    if (!state.xpPopups.length) return;
    const latest = state.xpPopups[state.xpPopups.length - 1];
    const timer = setTimeout(() => {
      dispatch({ type: "XP_POPUP_REMOVE", payload: latest.id });
    }, 2000);
    return () => clearTimeout(timer);
  }, [state.xpPopups.length]);

  // Auto-dismiss confetti after 3.5 seconds
  useEffect(() => {
    if (!state.confettiActive) return;
    const timer = setTimeout(() => {
      dispatch({ type: "CONFETTI", payload: false });
    }, 3500);
    return () => clearTimeout(timer);
  }, [state.confettiActive]);

  useEffect(() => {
    dispatch({ type: "SET_STATE", payload: initialState });
  }, [user]);

  return <GameContext.Provider value={{ state, dispatch, actions }}>{children}</GameContext.Provider>;
};

export const useGame = () => useContext(GameContext);
