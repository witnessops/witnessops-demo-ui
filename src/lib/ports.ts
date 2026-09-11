export interface PortDef {
  port: number;
  name: string;
  protocol: "TCP";
}

export const COMMON_PORTS: PortDef[] = [
  { port: 22, name: "SSH", protocol: "TCP" },
  { port: 80, name: "HTTP", protocol: "TCP" },
  { port: 443, name: "HTTPS", protocol: "TCP" },
  { port: 25, name: "SMTP", protocol: "TCP" },
  { port: 3389, name: "RDP", protocol: "TCP" },
  { port: 5432, name: "PostgreSQL", protocol: "TCP" },
  { port: 6379, name: "Redis", protocol: "TCP" },
];

export const DEFAULT_PUBLIC_SERVICE_PORTS = [22, 80, 443];

export function portDef(port: number): PortDef {
  return (
    COMMON_PORTS.find((item) => item.port === port) ?? {
      port,
      name: `Port ${port}`,
      protocol: "TCP",
    }
  );
}

export function portCheckId(port: number) {
  return `port-${port}`;
}

export function parsePortCheckId(id: string) {
  const match = /^port-(\d+)$/.exec(id);
  if (!match) return null;
  const port = Number(match[1]);
  return Number.isInteger(port) && port >= 1 && port <= 65535 ? port : null;
}

export function normalizePort(value: string) {
  const port = Number(value.trim());
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  return port;
}
