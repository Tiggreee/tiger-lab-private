#!/usr/bin/env node
/**
 * Contact Generator — engine/leads/contact-generator.mjs
 * 5 specialized contacts per company: CEO/Director, CFO/Finance, Ops, IT, Marketing
 * Real Mexican names × real roles × real email patterns.
 */

const ROLES = {
  ceo:      { title: 'Director General',      titles: ['CEO', 'Director General', 'Founder', 'Managing Director', 'Socio Director'] },
  finance:  { title: 'Director Financiero',    titles: ['CFO', 'Director Financiero', 'Contralor', 'Gerente Financiero', 'Tesorero'] },
  ops:      { title: 'Director de Operaciones', titles: ['COO', 'Director de Operaciones', 'Gerente de Operaciones', 'Jefe de Procesos', 'Operations Manager'] },
  it:       { title: 'Director de TI',         titles: ['CTO', 'Director de TI', 'Gerente de Sistemas', 'IT Manager', 'Tech Lead'] },
  marketing:{ title: 'Director de Marketing',  titles: ['CMO', 'Director de Marketing', 'Gerente Comercial', 'Marketing Manager', 'Growth Lead'] }
};

const FIRST_NAMES_M = ['Alejandro','Andrés','Carlos','Daniel','Eduardo','Fernando','Gabriel','Héctor','Ignacio','Javier','José','Luis','Manuel','Marco','Miguel','Óscar','Pablo','Rafael','Ricardo','Roberto','Sergio','Víctor','Adrián','Alberto','Arturo'];
const FIRST_NAMES_F = ['Adriana','Alejandra','Ana','Beatriz','Carmen','Claudia','Daniela','Diana','Gabriela','Isabel','Juana','Laura','Leticia','Lorena','Lucía','María','Mónica','Natalia','Patricia','Rosa','Sandra','Silvia','Teresa','Verónica','Ximena'];
const LAST_NAMES = ['García','Martínez','López','Hernández','González','Rodríguez','Pérez','Sánchez','Ramírez','Cruz','Flores','Morales','Vázquez','Jiménez','Reyes','Torres','Ruiz','Mendoza','Aguilar','Ortiz','Castillo','Romero','Álvarez','Moreno','Chávez'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateContact(company, role, index) {
  const isF = role === 'marketing' || (role === 'finance' && Math.random() > 0.5);
  const first = pick(isF ? FIRST_NAMES_F : FIRST_NAMES_M);
  const last1 = pick(LAST_NAMES);
  const last2 = Math.random() > 0.5 ? pick(LAST_NAMES) : '';
  const fullName = `${first} ${last1}${last2 ? ' ' + last2 : ''}`;
  
  const companySlug = company.name.toLowerCase().replace(/[^a-z0-9]+/g, '').substring(0, 15);
  const nameSlug = fullName.toLowerCase().replace(/\s+/g, '.');
  
  return {
    id: `CONT-${company.id || ''}-${role}`,
    companyId: company.id,
    company: company.name,
    name: fullName,
    role: ROLES[role].title,
    title: pick(ROLES[role].titles),
    email: `${nameSlug}@${companySlug}.com.mx`,
    phone: `+52${String(Math.floor(Math.random() * 900000000) + 100000000)}`,
    linkedin: `linkedin.com/in/${nameSlug}`,
    persona: role,
    seniority: role === 'ceo' ? 'C-Level' : role === 'finance' ? 'C-Level' : 'Director',
    decisionPower: role === 'ceo' ? 'decision-maker' : role === 'finance' ? 'economic-buyer' : 'influencer',
    pocket: role === 'ceo' ? 'strategic' : role === 'finance' ? 'budget' : role === 'ops' ? 'operational' : role === 'it' ? 'technical' : 'growth'
  };
}

export function generateContacts(companies) {
  const contacts = [];
  for (const company of companies) {
    for (const role of ['ceo','finance','ops','it','marketing']) {
      contacts.push(generateContact(company, role, contacts.length));
    }
  }
  return contacts;
}

export function contactsToCSV(contacts) {
  const h = 'id,company,name,role,title,email,phone,linkedin,persona,seniority,decisionPower,pocket';
  const rows = contacts.map(c => 
    `${c.id},"${c.company}","${c.name}","${c.role}","${c.title}",${c.email},${c.phone},${c.linkedin},${c.persona},${c.seniority},${c.decisionPower},${c.pocket}`
  );
  return [h, ...rows].join('\n');
}
