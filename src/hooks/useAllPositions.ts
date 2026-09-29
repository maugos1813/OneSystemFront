import { useEffect, useRef, useState } from "react";
import { getLatestPosition, realtimePositionsUrl } from "../lib/api";
import { getToken } from "../lib/auth";
import type { Position, Vehicle } from "../lib/types";

const RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10000, 30000];

/**
 * Latest known position per vehicle, kept live over a WebSocket instead of polling —
 * the backend pushes a message the moment a new position is stored (from the TCP
 * ingestion or the Radius Velocity poller), for every device across the whole org.
 * A REST snapshot is only fetched once up front and again on every (re)connect, to
 * seed state and to catch anything missed while the socket was down.
 */
export function useAllPositions(vehicles: Vehicle[]) {
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const vehiclesRef = useRef(vehicles);
  vehiclesRef.current = vehicles;

  useEffect(() => {
    if (vehicles.length === 0) return;

    let cancelled = false;
    let socket: WebSocket | null = null;
    let reconnectAttempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    async function fetchSnapshot() {
      const list = vehiclesRef.current;
      const results = await Promise.all(list.map(async (v) => [v.id, await getLatestPosition(v.id)] as const));
      if (cancelled) return;
      setPositions((prev) => {
        const next = { ...prev };
        for (const [vehicleId, position] of results) {
          if (position) next[vehicleId] = position;
        }
        return next;
      });
    }

    function scheduleReconnect() {
      if (cancelled) return;
      const delay = RECONNECT_DELAYS_MS[Math.min(reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)];
      reconnectAttempt += 1;
      reconnectTimer = setTimeout(connect, delay);
    }

    function connect() {
      const token = getToken();
      if (!token || cancelled) return;

      socket = new WebSocket(realtimePositionsUrl(token));

      socket.onopen = () => {
        reconnectAttempt = 0;
        fetchSnapshot();
      };

      socket.onmessage = (event) => {
        let msg: { type: string; deviceId?: string; position?: Position };
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }
        if (msg.type !== "position" || !msg.deviceId || !msg.position) return;

        const vehicle = vehiclesRef.current.find((v) => v.deviceId === msg.deviceId);
        if (!vehicle) return;
        const position = msg.position;
        setPositions((prev) => ({ ...prev, [vehicle.id]: position }));
      };

      socket.onclose = () => {
        if (cancelled) return;
        scheduleReconnect();
      };

      socket.onerror = () => {
        socket?.close();
      };
    }

    // Mobile browsers freeze timers/sockets in a backgrounded tab, so the WS can be
    // dead by the time the tab comes back — check and reconnect immediately instead of
    // waiting for a stale backoff timer.
    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      fetchSnapshot();
      if (socket && socket.readyState !== WebSocket.OPEN && socket.readyState !== WebSocket.CONNECTING) {
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectAttempt = 0;
        connect();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    fetchSnapshot();
    connect();

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when the set of vehicle ids changes
  }, [vehicles.map((v) => v.id).join(",")]);

  return positions;
}
