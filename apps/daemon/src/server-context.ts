import type { Express } from 'express';

export type ServerContext = Record<string, unknown>;

export type RouteRegistrar = (app: Express, ctx: ServerContext) => void;
