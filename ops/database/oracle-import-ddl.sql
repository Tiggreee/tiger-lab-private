-- Oracle DDL for importing leads data from CSV export
-- Compatible with Oracle SQL Developer and Oracle Data tools

CREATE TABLE tigerlab_companies (
  id NUMBER PRIMARY KEY,
  name VARCHAR2(255) NOT NULL,
  rfc VARCHAR2(20),
  industry VARCHAR2(100),
  size VARCHAR2(50),
  website VARCHAR2(500),
  phone VARCHAR2(50),
  address VARCHAR2(500),
  city VARCHAR2(100),
  state VARCHAR2(100),
  country VARCHAR2(10) DEFAULT 'MX',
  geo_lat NUMBER(10,7),
  geo_lng NUMBER(10,7),
  source VARCHAR2(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tigerlab_contacts (
  id NUMBER PRIMARY KEY,
  company_id NUMBER REFERENCES tigerlab_companies(id),
  full_name VARCHAR2(255) NOT NULL,
  title VARCHAR2(200),
  email VARCHAR2(255),
  phone VARCHAR2(50),
  linkedin_url VARCHAR2(500),
  is_decision_maker NUMBER(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tigerlab_leads (
  id NUMBER PRIMARY KEY,
  contact_id NUMBER REFERENCES tigerlab_contacts(id),
  company_id NUMBER REFERENCES tigerlab_companies(id),
  status VARCHAR2(50) DEFAULT 'new',
  pain_points VARCHAR2(1000),
  source VARCHAR2(100),
  score NUMBER DEFAULT 0,
  assigned_to VARCHAR2(255),
  notes VARCHAR2(2000),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tigerlab_interactions (
  id NUMBER PRIMARY KEY,
  lead_id NUMBER REFERENCES tigerlab_leads(id),
  type VARCHAR2(50),
  direction VARCHAR2(20) DEFAULT 'outbound',
  subject VARCHAR2(500),
  content CLOB,
  outcome VARCHAR2(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_tl_companies_industry ON tigerlab_companies(industry);
CREATE INDEX idx_tl_companies_city ON tigerlab_companies(city);
CREATE INDEX idx_tl_contacts_email ON tigerlab_contacts(email);
CREATE INDEX idx_tl_leads_status ON tigerlab_leads(status);
CREATE INDEX idx_tl_leads_score ON tigerlab_leads(score);
CREATE INDEX idx_tl_interactions_lead ON tigerlab_interactions(lead_id);

-- Sequence for auto-increment (Oracle style)
CREATE SEQUENCE seq_tigerlab_companies START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_tigerlab_contacts START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_tigerlab_leads START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_tigerlab_interactions START WITH 1 INCREMENT BY 1;
