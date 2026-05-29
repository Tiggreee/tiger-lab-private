interface SqlPool {
  query: (sql: string, params?: unknown[]) => Promise<unknown>;
}

interface EventRecord {
  type: string;
  payload: unknown;
}

interface ProductRecord {
  name: string;
  type: string;
  metadata?: unknown;
}

interface LeadRecord {
  source: string;
  metadata?: unknown;
}

interface MetricRecord {
  name: string;
  value: number;
  metadata?: unknown;
}

class SqlDataSink {
  constructor(private readonly pool: SqlPool) {}

  async saveEvent(event: EventRecord): Promise<void> {
    await this.pool.query(
      'INSERT INTO events(type, payload) VALUES ($1, $2)',
      [event.type, event.payload]
    );
  }

  async saveProduct(product: ProductRecord): Promise<void> {
    await this.pool.query(
      'INSERT INTO products(name, type, metadata) VALUES ($1, $2, $3)',
      [product.name, product.type, product.metadata || {}]
    );
  }

  async saveLead(lead: LeadRecord): Promise<void> {
    await this.pool.query(
      'INSERT INTO leads(source, metadata) VALUES ($1, $2)',
      [lead.source, lead.metadata || {}]
    );
  }

  async saveMetric(metric: MetricRecord): Promise<void> {
    await this.pool.query(
      'INSERT INTO metrics(name, value, metadata) VALUES ($1, $2, $3)',
      [metric.name, metric.value, metric.metadata || {}]
    );
  }
}

export default SqlDataSink;
