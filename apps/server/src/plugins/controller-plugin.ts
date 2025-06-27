import fastifyPlugin from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { getRoutes } from "@repo/gtf-reflected-router/src";
import { Container } from "typedi";

export interface ControllerOptions {
  controllers: any[];
  prefix?: string;
}

export const controllerPlugin = fastifyPlugin(
  async (fastify: FastifyInstance, options: ControllerOptions) => {
    const { controllers, prefix = "" } = options;

    controllers.forEach((Controller) => {
      const controllerInstance: any = Container.get(Controller);

      const routes = getRoutes(Controller);

      routes.forEach((route) => {
        const fullPath = prefix + route.path;

        fastify.route({
          method: route.method,
          url: fullPath,
          handler: controllerInstance[route.handler].bind(controllerInstance),
          ...route.options,
        });
      });
    });
  },
  {
    name: "controller-plugin",
  },
);
