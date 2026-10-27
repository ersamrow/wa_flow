import type { Knex } from 'knex';
import { randomUUID } from 'node:crypto';

export async function seedDemo(trx: Knex.Transaction, hash: string) {
  const now = new Date();
  const [userId] = await trx('users').insert({ name: 'Alex Morgan', email: `${randomUUID()}@demo.local`, password: hash, created_at: now, updated_at: now });
  const [businessId] = await trx('businesses').insert({ name: 'Little & Lovely', industry: 'Kidswear & lifestyle', email: 'hello@littleandlovely.example', demo: true, created_at: now, updated_at: now });
  await trx('business_users').insert({ business_id: businessId, user_id: userId, role: 'owner' });
  const base = { business_id: businessId, created_at: now, updated_at: now };
  const names = ['Priya Sharma', 'Rahul Mehta', 'Ananya Patel', 'Arjun Singh', 'Sneha Kapoor', 'Vikram Rao', 'Meera Shah', 'Rohan Gupta'];
  const texts = ['Hi! Is the linen romper available in size 2–3?', 'Thanks so much! The package arrived today 😊', 'Could you share your latest collection?', 'Do you deliver to Bengaluru?', 'I would love to order the matching set.', 'What is your return policy?', 'Can you help me pick a birthday gift?', 'The quality is lovely. Thank you!'];
  for (const [i, name] of names.entries()) {
    const [customerId] = await trx('customers').insert({ ...base, name, phone: `+9198765432${String(i).padStart(2, '0')}`, tag: i % 3 === 0 ? 'VIP' : 'New', status: i % 3 === 0 ? 'VIP' : 'Customer', opted_in: true });
    const [conversationId] = await trx('conversations').insert({ ...base, customer_id: customerId, mode: i % 2 === 0 ? 'ai' : 'human', status: [1, 7].includes(i) ? 'resolved' : 'open', unread: [0, 2].includes(i) ? 1 : 0, updated_at: new Date(+now - i * 480000), assignee: i % 2 ? 'Alex Morgan' : null });
    for (let day = 13; day >= 1; day--) {
      if ((day + i) % 3 === 0) continue;
      await trx('messages').insert({ ...base, conversation_id: conversationId, body: 'Sample conversation activity', direction: i % 2 ? 'outbound' : 'inbound', status: 'demo', created_at: new Date(+now - day * 86400000) });
    }
    await trx('messages').insert([{ ...base, conversation_id: conversationId, body: `Hello ${name}! Welcome to Little & Lovely. How can we help you today?`, direction: 'outbound', status: 'demo', created_at: new Date(+now - (i * 8 + 2) * 60000) }, { ...base, conversation_id: conversationId, body: texts[i], direction: 'inbound', status: 'demo', created_at: new Date(+now - i * 480000) }]);
  }
  for (const [name, sku, category, price_paise, stock] of [['Linen baby romper', 'LL-001', 'Everyday essentials', 129900, 42], ['Everyday cotton set', 'LL-002', 'Co-ord sets', 159900, 28], ['Little explorer dungarees', 'LL-003', 'Outdoor adventures', 189900, 16], ['Cloud knit cardigan', 'LL-004', 'Cozy layers', 219900, 8]]) await trx('products').insert({ ...base, name, sku, category, price_paise, stock });
  for (const [name, keyword, response, active] of [['A warm welcome', 'hello', 'Hello! Welcome to Little & Lovely. Tell us what you are looking for and we will help you find it.', true], ['Shipping questions', 'deliver', 'We deliver across India. Standard delivery takes 4–7 business days.', true], ['Returns made easy', 'return', 'Unused items can be returned within 7 days of delivery. Please share your order number with our team.', true], ['Share the collection', 'collection', 'Our collection includes linen rompers, cotton sets, dungarees, and cozy knitwear. What age are you shopping for?', false]]) await trx('automations').insert({ ...base, name, keyword, response, active });
  await trx('knowledge').insert([{ ...base, title: 'Shipping & delivery', content: 'We ship across India. Standard delivery takes 4–7 business days. Shipping is free on orders above ₹1,999.' }, { ...base, title: 'Our return policy', content: 'Unused items with original tags may be returned within 7 days of delivery. Contact our team with your order number.' }]);
  await trx('campaigns').insert({ ...base, name: 'A little something for the festive season', audience: 'All opted-in customers', body: 'Our festive collection is here! Explore thoughtfully made styles for your little ones.', status: 'Draft' });
  return trx('users').where({ id: userId }).first();
}
