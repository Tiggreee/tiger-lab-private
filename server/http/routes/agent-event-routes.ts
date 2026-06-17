import { Router } from '../routes/router';
import { AgentEventController } from '../controllers/AgentEventController';

export function registerAgentEventRoutes(router: Router): void {
  const controller = new AgentEventController();

  router.add('POST', '/agent-events/emit', (req, res) => controller.emit(req, res));
  router.add('POST', '/agent-events/subscribe', (req, res) => controller.subscribe(req, res));
  router.add('GET', '/agent-events/pending/:subscriber', (req, res) => controller.getPending(req, res));
  router.add('POST', '/agent-events/consume', (req, res) => controller.consume(req, res));
  router.add('GET', '/agent-events/history', (req, res) => controller.getHistory(req, res));
  router.add('GET', '/agent-events/stats', (req, res) => controller.getStats(req, res));
  router.add('POST', '/agent-events/trigger', (req, res) => controller.trigger(req, res));
}
