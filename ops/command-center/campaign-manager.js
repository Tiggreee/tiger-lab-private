/**
 * Campaign Manager — ops/command-center/campaign-manager.js
 * Dashboard widget: campaign list, approval cards, metrics.
 * Mini Power BI style. Embedded in main dashboard.
 */

(function() {
  'use strict';

  const CAMPAIGNS_URL = '/runtime/campaigns/campaign-index.json';

  let campaigns = [];
  let selectedCampaign = null;

  async function loadCampaigns() {
    try {
      const resp = await fetch(CAMPAIGNS_URL);
      if (!resp.ok) throw new Error('No campaigns found');
      campaigns = await resp.json();
    } catch {
      campaigns = [];
    }
  }

  function renderCampaignCard(card) {
    const { id, title, product, headline, prospects, targetProspects, channels, cta, colors } = card;
    const pct = Math.round((prospects / targetProspects) * 100);
    const barColor = pct >= 100 ? '#00C853' : pct >= 50 ? '#FFC107' : '#FF5252';

    return `
      <div class="campaign-card ${card.status}" data-id="${id}" style="
        background:#fff;
        border-radius:10px;
        padding:16px;
        margin:10px 0;
        box-shadow:0 2px 12px rgba(0,0,0,0.06);
        border-left:4px solid ${colors?.header || '#6C47FF'};
        cursor:pointer;
        transition:transform 0.15s;
      " onclick="CampaignManager.select('${id}')">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <span style="font-weight:700;font-size:15px;">${title}</span>
          <span style="background:${card.status === 'pending_approval' ? '#FFC107' : '#00C853'};color:#000;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;">
            ${card.status === 'pending_approval' ? '⏳ PENDIENTE' : '✅ APROBADA'}
          </span>
        </div>
        <div style="font-size:13px;color:#555;margin-bottom:8px;">${headline}</div>
        <div style="display:flex;gap:12px;font-size:12px;color:#888;">
          <span>📦 ${product}</span>
          <span>👥 ${prospects}/${targetProspects}</span>
          <span>📊 ${channels}</span>
        </div>
        <div style="margin-top:8px;background:#eee;border-radius:4px;height:6px;overflow:hidden;">
          <div style="width:${pct}%;height:100%;background:${barColor};border-radius:4px;transition:width 0.3s;"></div>
        </div>
        <div style="margin-top:10px;display:flex;gap:8px;">
          <button onclick="event.stopPropagation();CampaignManager.action('approve','${id}')" style="flex:1;padding:6px;background:#00C853;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">▶️ APROBAR</button>
          <button onclick="event.stopPropagation();CampaignManager.action('edit','${id}')" style="padding:6px 12px;background:#FFC107;color:#000;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">✏️</button>
          <button onclick="event.stopPropagation();CampaignManager.action('reject','${id}')" style="padding:6px 12px;background:#FF5252;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">❌</button>
        </div>
      </div>
    `;
  }

  function renderDetail(card) {
    if (!card) return '<div style="padding:30px;text-align:center;color:#888;">Selecciona una campaña para ver detalles</div>';

    return `
      <div style="padding:16px;">
        <h3 style="margin-top:0;">${card.title}</h3>
        <div style="background:#f5f5f5;padding:12px;border-radius:8px;margin:10px 0;">
          <strong>Copy:</strong>
          <p style="font-size:14px;color:#333;">${card.bodyPreview}</p>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;">
          <div><strong>Producto:</strong> ${card.product}</div>
          <div><strong>Canales:</strong> ${card.channels}</div>
          <div><strong>Prospects:</strong> ${card.prospects}/${card.targetProspects}</div>
          <div><strong>CTA:</strong> ${card.cta}</div>
        </div>
        ${card.bullets?.length ? `
          <div style="margin-top:10px;">
            <strong>Bullets:</strong>
            <ul style="font-size:13px;padding-left:16px;">
              ${card.bullets.map(b => `<li>${b}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        ${card.imagePreview ? `
          <div style="margin-top:10px;">
            <strong>Preview:</strong>
            <img src="${card.imagePreview}" style="width:100%;border-radius:8px;margin-top:5px;" alt="Preview" />
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderPanel() {
    const container = document.getElementById('campaignPanel');
    if (!container) return;

    const pendingList = document.getElementById('campaignList');
    const detailView = document.getElementById('campaignDetail');

    if (pendingList) {
      const pending = campaigns.filter(c => c.status === 'pending_approval');
      if (pending.length === 0) {
        pendingList.innerHTML = '<div style="padding:20px;text-align:center;color:#888;">No hay campañas pendientes. <a href="#" onclick="CampaignManager.design()">Diseñar nueva</a></div>';
      } else {
        pendingList.innerHTML = pending.map(renderCampaignCard).join('');
      }
    }

    if (detailView) {
      detailView.innerHTML = renderDetail(selectedCampaign);
    }
  }

  window.CampaignManager = {
    async init() {
      await loadCampaigns();
      this.render();
    },

    render() {
      renderPanel();
    },

    select(id) {
      selectedCampaign = campaigns.find(c => c.id === id) || null;
      renderPanel();
    },

    action(action, id) {
      console.log(`Campaign ${action}: ${id}`);
      const card = campaigns.find(c => c.id === id);
      if (action === 'approve' && card) {
        card.status = 'approved';
        fetch('/runtime/campaigns/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, action: 'approve' })
        }).catch(() => {});
      }
      if (action === 'reject' && card) {
        card.status = 'rejected';
      }
      renderPanel();
      alert(`Campaña ${id}: ${action.toUpperCase()}`);
    },

    design() {
      const product = prompt('Producto (Docflow API / Script Premium Kit / FacturAutentico):', 'Docflow API');
      if (!product) return;
      const channels = prompt('Canales (email,linkedin,facebook,x,telegram,discord):', 'email,linkedin');
      if (!channels) return;

      alert(`Diseñando campaña para ${product} en ${channels}...`);
    },

    getCampaigns() {
      return campaigns;
    }
  };
})();
