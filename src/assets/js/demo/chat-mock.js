/**
 * Demo transport for components/chat.js: answers from the sample data in
 * src/data/ so the chat UI can be explored without a model or server.
 * Replace it by setting data-chat-endpoint or registering your own transport
 * (see docs/AI-CHAT.md). Not intended for production.
 *
 * Personas (data-chat-persona):
 *   support  — store/site support: order tracking, returns, shipping, handoff
 *   analyst  — "ask your data" over sales, orders and customers, with charts
 *   general  — general assistant: code, accessibility, planning with tool steps
 *   agent    — multi-step coding agent emitting plan/step events for a run panel
 *
 * @module demo/chat-mock
 */
import { formatValue, percentChange } from '../core/format.js';

const dataUrl = (name) => new URL(`../../../data/${name}.json`, import.meta.url).href;
const pageUrl = (path) => new URL(`../../../${path}`, import.meta.url).href;
const cache = new Map();

async function data(name) {
  if (!cache.has(name)) {
    cache.set(
      name,
      fetch(dataUrl(name)).then((r) => {
        if (!r.ok) throw new Error(`Could not load ${name}.json`);
        return r.json();
      })
    );
  }
  return cache.get(name);
}

const money = (n) => formatValue(n, 'currency');
const compactMoney = (n) => formatValue(n, 'currency-compact');
const month = (m) => formatValue(m, 'month');

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      window.clearTimeout(timer);
      reject(new DOMException('Stopped', 'AbortError'));
    }, { once: true });
  });
}

let toolCounter = 0;
const tool = (name, title, input, run) => ({ kind: 'tool', id: `tool-${(toolCounter += 1)}`, name, title, input, run });

/* ---- Personas ---------------------------------------------------------- */
async function support(text) {
  const t = text.toLowerCase();
  const orderId = (t.match(/#?(\d{4})/) || [])[1];

  if (orderId || /\b(order|track|where|delivery status)\b/.test(t)) {
    const id = orderId || '1061';
    return [
      tool('lookup_order', `Looking up order #${id}`, { order_id: `#${id}` }, async () => {
        const order = (await data('orders')).find((o) => o.id === `#${id}`);
        return order ? `Found #${id}: ${order.status}, ${money(order.total)}, placed ${formatValue(order.date, 'date')}` : `No order #${id}`;
      }),
      async () => {
        const order = (await data('orders')).find((o) => o.id === `#${id}`);
        if (!order) return `I couldn't find order **#${id}**. Order numbers are four digits, for example #1061. You can also [contact our team](${pageUrl('templates/website/contact.html')}).`;
        const next = {
          Paid: 'It is being packed and should ship within 24 hours.',
          Shipped: 'It is on its way. Delivery usually takes 2–4 business days.',
          Delivered: 'It was delivered. If anything is wrong, you can start a return within 30 days.',
          Pending: 'Payment is still being confirmed. This usually takes a few minutes.',
          Failed: 'The payment did not go through, so nothing has been charged. You can retry from your account.',
          Refunded: 'The refund has been issued and should appear within 5–10 business days.',
        }[order.status] || '';
        return `Order **${order.id}** for ${order.customer} is **${order.status}**.\n\n- ${order.items} item${order.items === 1 ? '' : 's'}: ${order.products.join(', ')}\n- Total: ${money(order.total)}\n- Placed: ${formatValue(order.date, 'date')}\n\n${next}`;
      },
      { type: 'suggestions', items: ['How do I return an item?', 'Talk to a person', 'Track order #1063'] },
    ];
  }
  if (/return|refund|exchange/.test(t)) {
    return [
      `You can return any item within **30 days** of delivery for a full refund.\n\n1. Go to your orders and choose **Start a return**.\n2. Print the prepaid label, or show the QR code at a drop-off point.\n3. Refunds arrive 5–10 business days after we receive the item.\n\nItems must be unused and in their original packaging.`,
      { type: 'sources', items: [{ title: 'Shipping and returns', url: pageUrl('templates/e-commerce/product.html#reviews') }, { title: 'Contact support', url: pageUrl('templates/website/contact.html') }] },
      { type: 'suggestions', items: ['How long does shipping take?', 'Where is my order #1061?'] },
    ];
  }
  if (/ship|deliver|arrive/.test(t)) {
    return [`Standard shipping is **free over $50** and takes 2–4 business days. Express (1–2 days) is $12.95. You will get a tracking link by email as soon as your order ships.`, { type: 'suggestions', items: ['Track order #1063', 'What is your return policy?'] }];
  }
  if (/person|human|agent|someone|call/.test(t)) {
    return [`I've flagged this conversation for our support team. Someone will reply **within one business day**, or you can reach us now:\n\n- Email: [hello@example.com](mailto:hello@example.com)\n- Phone: +1 555 0100 (Mon–Fri, 9:00–17:00 PT)`];
  }
  if (/price|plan|cost|pricing/.test(t)) {
    return [`We have three plans: **Starter** (free), **Team** ($29/month) and **Enterprise** (custom). See the [pricing section](${pageUrl('templates/landing-page/index.html#pricing')}) for details.`];
  }
  if (/^(hi|hello|hey)\b/.test(t)) return ['Hello! How can I help today? I can track orders, explain returns and shipping, or connect you with a person.'];
  return [
    `I'm a demo assistant running on sample data, so I can only help with a few things. Try one of these:`,
    { type: 'suggestions', items: ['Where is my order #1061?', 'What is your return policy?', 'How long does shipping take?', 'Talk to a person'] },
  ];
}

async function analyst(text) {
  const t = text.toLowerCase();

  if (/channel|source|traffic/.test(t)) {
    return [
      tool('run_query', 'Querying revenue by channel', 'SELECT channel, SUM(revenue) FROM sales WHERE month = \'2026-10\' GROUP BY channel', async () => `${(await data('sales')).channels.length} rows`),
      async () => {
        const { channels } = await data('sales');
        const total = channels.reduce((s, c) => s + c.revenue, 0);
        const [top, second] = [...channels].sort((a, b) => b.revenue - a.revenue);
        return [
          { type: 'chart', viz: 'donut', title: 'Revenue by channel, October 2026', x: 'channel', series: 'revenue:Revenue', format: 'currency-compact', rows: channels, height: 220 },
          `**${top.channel}** is the largest channel with ${money(top.revenue)} (${Math.round((top.revenue / total) * 100)}% of ${money(total)}), followed by ${second.channel} at ${money(second.revenue)}.\n\nEmail punches above its weight: ${Math.round((channels.find((c) => c.channel === 'Email').revenue / total) * 100)}% of revenue from a channel you fully control.`,
        ];
      },
      { type: 'suggestions', items: ['Show revenue by region', 'Forecast next month', 'Which customers are at risk?'] },
    ];
  }
  if (/region|country|geograph/.test(t)) {
    return [
      tool('run_query', 'Querying revenue by region', 'SELECT region, SUM(revenue) FROM sales GROUP BY region', async () => '5 rows'),
      async () => {
        const { regions } = await data('sales');
        return [
          { type: 'chart', viz: 'hbar', title: 'Revenue by region, October 2026', x: 'region', series: 'revenue:Revenue:2', format: 'currency-compact', rows: regions },
          `North America leads with ${money(regions[0].revenue)}, then Europe at ${money(regions[1].revenue)}. Asia Pacific is the fastest-growing region in the sample data.`,
        ];
      },
    ];
  }
  if (/categor|product|best.?sell/.test(t)) {
    return [
      tool('run_query', 'Querying revenue by category', 'SELECT category, SUM(revenue), SUM(units) FROM sales GROUP BY category', async () => '6 rows'),
      async () => {
        const { categories } = await data('sales');
        const top = categories[0];
        return [
          { type: 'chart', viz: 'bar', title: 'Revenue by category', x: 'category', series: 'revenue:Revenue:4', format: 'currency-compact', rows: categories },
          `**${top.category}** is the top category (${money(top.revenue)} from ${top.units} units). Photography has the highest average price at ${money(categories.find((c) => c.category === 'Photography').revenue / 96)} per unit.`,
        ];
      },
    ];
  }
  if (/pending|failed|refund|status|order/.test(t)) {
    return [
      tool('search_orders', 'Searching orders', { since: '2026-08-09', group_by: 'status' }, async () => `${(await data('orders')).length} orders scanned`),
      async () => {
        const orders = await data('orders');
        const counts = orders.reduce((acc, o) => ({ ...acc, [o.status]: (acc[o.status] || 0) + 1 }), {});
        const attention = orders.filter((o) => o.status === 'Pending' || o.status === 'Failed').slice(0, 5);
        const rows = Object.entries(counts).map(([status, count]) => ({ status, count }));
        return [
          { type: 'chart', viz: 'bar', title: 'Orders by status, last 60 days', x: 'status', series: 'count:Orders:1', format: 'integer', rows, height: 200 },
          `Of ${orders.length} recent orders, **${counts.Pending || 0} are pending** and **${counts.Failed || 0} failed**. These need attention:\n\n${attention.map((o) => `- ${o.id} · ${o.customer} · ${o.status} · ${money(o.total)}`).join('\n')}\n\nOpen the [orders page](${pageUrl('templates/dashboard/orders.html?q=Pending')}) to follow up.`,
        ];
      },
    ];
  }
  if (/customer|churn|risk|vip|segment|retention/.test(t)) {
    return [
      tool('search_customers', 'Analysing customer segments', { segments: ['VIP', 'Active', 'New', 'At risk', 'Churned'] }, async () => '40 customers analysed'),
      async () => {
        const [customers, sales] = await Promise.all([data('customers'), data('sales')]);
        const risk = customers.filter((c) => c.segment === 'At risk').sort((a, b) => b.spent - a.spent);
        return [
          { type: 'chart', viz: 'donut', title: 'Customers by segment', x: 'segment', series: 'customers:Customers', format: 'integer', rows: sales.segments, height: 200 },
          `**${risk.length} customers are at risk** (no order in 70+ days). Together they have spent ${money(risk.reduce((s, c) => s + c.spent, 0))}. Highest value first:\n\n${risk.slice(0, 4).map((c) => `- ${c.name} (${c.country}) — ${money(c.spent)}, last order ${formatValue(c.lastOrder, 'date')}`).join('\n')}\n\nA win-back email with a 10% code would be a good next step.`,
        ];
      },
      { type: 'suggestions', items: ['Draft a win-back email', 'Show revenue by channel', 'Forecast next month'] },
    ];
  }
  if (/forecast|predict|next month|projection/.test(t)) {
    return [
      tool('forecast', 'Fitting a linear trend', { series: 'revenue', window: '6 months' }, async () => 'Trend fitted'),
      async () => {
        const { monthly } = await data('sales');
        const last = monthly.slice(-6);
        const n = last.length;
        const xs = last.map((_, i) => i);
        const ys = last.map((m) => m.revenue);
        const mx = xs.reduce((a, b) => a + b) / n;
        const my = ys.reduce((a, b) => a + b) / n;
        const slope = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / xs.reduce((s, x) => s + (x - mx) ** 2, 0);
        const projected = Math.round(my + slope * (n - mx));
        const rows = [...last.map((m) => ({ month: m.month, revenue: m.revenue })), { month: '2026-11', revenue: projected }];
        return [
          { type: 'chart', viz: 'line', title: 'Revenue with November projection', x: 'month', xFormat: 'short-month', series: 'revenue:Revenue', format: 'currency-compact', rows },
          `A linear trend over the last six months projects **${money(projected)}** for November 2026 (about ${compactMoney(Math.round(slope))} growth per month).\n\n*This is a simple trend line on sample data, not a statistical forecast.*`,
        ];
      },
    ];
  }
  if (/win.?back|email|draft/.test(t)) {
    return [`Here's a short win-back email:\n\n> **Subject:** We saved something for you\n>\n> Hi {first_name}, it's been a while! Here's **10% off** your next order with code **WELCOME10**, valid for 14 days. We've added new audio and wearables you might like.\n\nWant me to tailor it for VIP customers instead?`];
  }
  if (/revenue|sales|trend|month|growth|how.*(doing|perform)/.test(t) || !t.trim()) {
    return [
      tool('run_query', 'Querying monthly revenue', 'SELECT month, revenue, target FROM sales ORDER BY month', async () => '12 rows'),
      async () => {
        const { monthly } = await data('sales');
        const latest = monthly[monthly.length - 1];
        const prev = monthly[monthly.length - 2];
        const best = monthly.reduce((a, b) => (b.revenue > a.revenue ? b : a));
        const total = monthly.reduce((s, m) => s + m.revenue, 0);
        return [
          { type: 'chart', viz: 'area', title: 'Monthly revenue vs target', x: 'month', xFormat: 'short-month', series: 'revenue:Revenue,target:Target', format: 'currency-compact', rows: monthly },
          `Revenue was **${money(latest.revenue)}** in ${month(latest.month)}, up ${percentChange(latest.revenue, prev.revenue)}% on ${month(prev.month)} and just above the ${money(latest.target)} target.\n\n- Best month: ${month(best.month)} (${money(best.revenue)})\n- Last 12 months: ${money(total)}\n- January dipped to ${money(monthly[2].revenue)} after the holiday peak.`,
        ];
      },
      { type: 'suggestions', items: ['Which channel drives the most revenue?', 'Any pending or failed orders?', 'Which customers are at risk?'] },
    ];
  }
  return [
    `I can answer questions about the sample sales, orders and customers data. For example:`,
    { type: 'suggestions', items: ['How is revenue trending?', 'Which channel drives the most revenue?', 'Any pending or failed orders?', 'Forecast next month'] },
  ];
}

async function general(text, history) {
  const t = text.toLowerCase();
  const files = history[history.length - 1]?.files || [];
  if (files.length) {
    return [`Thanks, I received **${files.join(', ')}**. In this demo files stay in your browser and are not uploaded. Connect a backend with \`data-chat-endpoint\` to process them.`];
  }
  if (/code|function|javascript|debounce|snippet/.test(t)) {
    return [
      'Here is a dependency-free `debounce` helper:\n\n```js\nexport function debounce(fn, wait = 200) {\n  let timer;\n  return (...args) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), wait);\n  };\n}\n\n// Usage\ninput.addEventListener(\'input\', debounce(search, 250));\n```\n\nIt delays `fn` until `wait` milliseconds pass without another call, which is ideal for search fields.',
      { type: 'suggestions', items: ['Make it cancellable', 'Explain WCAG 2.2 target size', 'Plan a product launch'] },
    ];
  }
  if (/wcag|accessib|a11y|screen reader/.test(t)) {
    return [
      'WCAG 2.2 has three principles product teams trip over most:\n\n1. **Focus visible and not obscured** (2.4.7, 2.4.11): sticky headers must not hide the focused element.\n2. **Target size** (2.5.8): at least 24×24 CSS pixels; 44×44 is better on touch screens.\n3. **Accessible authentication** (3.3.8): allow paste and password managers.\n\nThis repository checks contrast, names, labels and keyboard behaviour automatically with `audit-a11y`.',
      { type: 'sources', items: [{ title: 'WCAG 2.2 overview (W3C)', url: 'https://www.w3.org/WAI/standards-guidelines/wcag/' }, { title: 'Our WCAG 2.2 guide', url: pageUrl('templates/website/blog-post.html') }] },
    ];
  }
  if (/plan|launch|roadmap|strategy/.test(t)) {
    return [
      tool('search_docs', 'Searching launch playbooks', { query: 'product launch checklist' }, async () => '3 documents found'),
      tool('analyze', 'Comparing past launches', { launches: 4 }, async () => 'Email and partner channels converted best'),
      '**A four-week launch plan**\n\n1. **Week 1 – Readiness:** freeze scope, run an accessibility and performance audit, prepare support macros.\n2. **Week 2 – Private beta:** invite 50 customers, collect feedback in-app.\n3. **Week 3 – Announce:** email list first, then partners and social.\n4. **Week 4 – Review:** compare activation against target and plan fixes.',
      { type: 'suggestions', items: ['Write the launch email', 'Turn this into a checklist', 'What metrics should we track?'] },
    ];
  }
  if (/^(hi|hello|hey)\b/.test(t)) return ['Hi! Ask me to write code, explain accessibility rules or plan a project. In this demo I run on scripted answers.'];
  return [
    `Here's a quick take on “${text.slice(0, 80)}”.\n\nThis demo assistant uses scripted answers. Connect a real model by pointing \`data-chat-endpoint\` at your backend; replies then stream into exactly this interface, including tool steps, sources and charts.`,
    { type: 'suggestions', items: ['Write a debounce function', 'Explain WCAG 2.2', 'Plan a product launch'] },
  ];
}

async function agent(text) {
  const goal = text.slice(0, 120);
  const steps = [
    { id: 's1', title: 'Understand the request' },
    { id: 's2', title: 'Search the codebase' },
    { id: 's3', title: 'Read relevant components' },
    { id: 's4', title: 'Write the change' },
    { id: 's5', title: 'Run validation' },
  ];
  const step = (id, status) => ({ type: 'step', id, status });
  return [
    { type: 'plan', goal, steps },
    step('s1', 'running'),
    `I'll work on: **${goal}**. Here's my plan, shown on the right as I go.`,
    step('s1', 'done'),
    step('s2', 'running'),
    tool('search_repository', 'Searching the repository', { pattern: 'data-chat|chat__' }, async () => 'src/components/chat.html\nsrc/assets/js/components/chat.js\nsrc/assets/css/components/chat.css'),
    step('s2', 'done'),
    step('s3', 'running'),
    tool('read_file', 'Reading src/components/chat.html', { path: 'src/components/chat.html' }, async () => '62 lines · metadata header found'),
    step('s3', 'done'),
    step('s4', 'running'),
    tool('write_file', 'Writing src/components/feedback-banner.html', { path: 'src/components/feedback-banner.html' }, async () => 'Created 18 lines'),
    { type: 'artifact', title: 'src/components/feedback-banner.html', language: 'html', content: '<!--\n@component: Feedback banner\n@category: AI\n@description: Asks users to rate an AI answer.\n@css: components/feedback.css\n@js: none\n@a11y: Uses a fieldset with a legend; buttons have text labels.\n-->\n<form class="alert" action="/feedback" method="post">\n  <fieldset class="fieldset">\n    <legend class="fieldset__legend">Was this answer helpful?</legend>\n    <div class="cluster">\n      <button type="submit" class="btn btn--sm" name="rating" value="up">Yes</button>\n      <button type="submit" class="btn btn--sm btn--secondary" name="rating" value="down">No</button>\n    </div>\n  </fieldset>\n</form>' },
    step('s4', 'done'),
    step('s5', 'running'),
    tool('run_command', 'Running bash .claude/skills/validate-w3c.sh', { command: 'bash .claude/skills/validate-w3c.sh' }, async () => '✓ HTML documents\n✓ Component snippets\n✓ Stylesheets\n✓ PASSED: 0 errors, 0 warnings'),
    step('s5', 'done'),
    `Done. I created **src/components/feedback-banner.html** following CLAUDE.md (no dependencies, native form controls, metadata header) and validation passed.\n\nNext: run \`node .claude/skills/generate-doc.js\` to add it to the gallery and docs.`,
    { type: 'suggestions', items: ['Add browser tests for it', 'Explain each step', 'Create another component'] },
  ];
}

const PERSONAS = { support, analyst, general, agent };

/**
 * Create a mock transport for a persona.
 * @param {keyof PERSONAS} persona
 */
export function createMockTransport(persona) {
  const respond = PERSONAS[persona] || general;

  return async function* mockTransport({ messages, signal }) {
    const last = messages[messages.length - 1];
    const script = await respond(last ? last.text : '', messages);
    await sleep(350, signal);

    for (const entry of script) {
      if (signal?.aborted) throw new DOMException('Stopped', 'AbortError');
      const items = typeof entry === 'function' ? [].concat(await entry()) : [entry];
      for (const item of items) {
        if (typeof item === 'string') {
          const tokens = item.match(/\S+\s*|\s+/g) || [];
          for (let i = 0; i < tokens.length; i += 2) {
            await sleep(18 + Math.random() * 30, signal);
            yield { type: 'text', delta: tokens.slice(i, i + 2).join('') };
          }
          yield { type: 'text', delta: '\n\n' };
        } else if (item.kind === 'tool') {
          yield { type: 'tool', id: item.id, name: item.name, title: item.title, status: 'running', input: item.input };
          await sleep(700, signal);
          let output;
          try {
            output = await item.run();
            yield { type: 'tool', id: item.id, name: item.name, title: item.title, status: 'done', input: item.input, output };
          } catch (error) {
            yield { type: 'tool', id: item.id, name: item.name, title: item.title, status: 'error', input: item.input, output: error.message };
          }
        } else {
          if (item.type === 'step' || item.type === 'plan') await sleep(250, signal);
          yield item;
        }
      }
    }
    yield { type: 'done' };
  };
}
