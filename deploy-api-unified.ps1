$apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYTA2ZGNiNi0zMzJiLTRhY2UtOGFjMi1jZDZmZDUzZTQ2ODEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWRkZWFiZWEtYTllNi00Mzg0LThkYWEtYTUxNTk0ZTkxNWU0IiwiaWF0IjoxNzc0Mjc2ODU5fQ.HdCV3HEarR7TiVJ-V2CxwjD6W0tS4GoDLrync_iiV0Y"
$baseUrl = "https://n8n.tayninh.cloud/api/v1"
$headers = @{ "X-N8N-API-KEY" = $apiKey; "Content-Type" = "application/json; charset=utf-8" }
$wfId = "UaByH10QsUh76BMB"

$apiCode = @'
const query = $input.first().json.query || {};
const body = $input.first().json.body || {};
const endpoint = query.endpoint || '';
const page = query.page || body.page || '';
const userId = query.user_id || '';

const BASE = 'https://n8n.tayninh.cloud/api/v1/data-tables';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYTA2ZGNiNi0zMzJiLTRhY2UtOGFjMi1jZDZmZDUzZTQ2ODEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWRkZWFiZWEtYTllNi00Mzg0LThkYWEtYTUxNTk0ZTkxNWU0IiwiaWF0IjoxNzc0Mjc2ODU5fQ.HdCV3HEarR7TiVJ-V2CxwjD6W0tS4GoDLrync_iiV0Y';
const T = { users: 'KUg80nCMpynKaD0a', products: '7z0WIlnEtZtmI9LK', trans: 'y40vtdofdKR11u8V', locations: 'NPLDQl2EDZNUDK1M', bwlogs: 'OsCifZ43Nr9lFksZ' };

async function loadTable(tableId) {
  const resp = await this.helpers.httpRequest({ method: 'GET', url: `${BASE}/${tableId}/rows`, headers: { 'X-N8N-API-KEY': API_KEY } });
  return resp.data || [];
}

// Smart loading: only fetch what's needed
let rawUsers = [], rawProducts = [], transactions = [], rawLocations = [], bwLogs = [];

if (endpoint === 'check_auth' || endpoint === 'admin_add_user') {
  rawUsers = await loadTable(T.users);
} else if (endpoint === 'inventory') {
  const [u, t] = await Promise.all([loadTable(T.users), loadTable(T.trans)]);
  rawUsers = u; transactions = t;
} else if (endpoint === 'products') {
  const [u, p] = await Promise.all([loadTable(T.users), loadTable(T.products)]);
  rawUsers = u; rawProducts = p;
} else if (endpoint === 'transactions') {
  const [u, t] = await Promise.all([loadTable(T.users), loadTable(T.trans)]);
  rawUsers = u; transactions = t;
} else if (endpoint === 'locations') {
  const [u, l] = await Promise.all([loadTable(T.users), loadTable(T.locations)]);
  rawUsers = u; rawLocations = l;
} else if (endpoint === 'bandwidth_logs') {
  const [u, b] = await Promise.all([loadTable(T.users), loadTable(T.bwlogs)]);
  rawUsers = u; bwLogs = b;
} else {
  const [u, p, t] = await Promise.all([loadTable(T.users), loadTable(T.products), loadTable(T.trans)]);
  rawUsers = u; rawProducts = p; transactions = t;
}

// Users: deduplicate by telegram_id (latest row wins)
const usersMap = new Map();
rawUsers.forEach(u => usersMap.set(u.telegram_id, u));
const users = Array.from(usersMap.values());

// Products: deduplicate by pid (latest row id wins)
const prodMap = new Map();
rawProducts.forEach(p => {
  const existing = prodMap.get(p.pid);
  if (!existing || p.id > existing.id) prodMap.set(p.pid, p);
});
const products = Array.from(prodMap.values());

// Locations: deduplicate by lid
const locMap = new Map();
rawLocations.forEach(l => {
  const existing = locMap.get(l.lid);
  if (!existing || l.id > existing.id) locMap.set(l.lid, l);
});
const locations = Array.from(locMap.values());

let response = { success: false, message: 'Unknown: ' + endpoint };
let writeNeeded = false;
let writeUrl = '';
let writeBody = {};

if (endpoint === 'admin_add_user' && body.telegram_id) {
  const existing = users.find(u => u.telegram_id === String(body.telegram_id));
  writeNeeded = true;
  writeUrl = `${BASE}/${T.users}/rows`;
  if (existing) {
    writeBody = { data: [{ telegram_id: String(body.telegram_id), pages: body.pages || existing.pages, role: body.role || existing.role, active: true }] };
    response = { success: true, message: 'User updated', count: users.length };
  } else {
    writeBody = { data: [{ telegram_id: String(body.telegram_id), pages: body.pages || 'RR88,XX88,MM88', role: body.role || 'user', active: true }] };
    response = { success: true, message: 'User added', count: users.length + 1 };
  }
}

else if (endpoint === 'check_auth') {
  const u = users.find(u => u.telegram_id === String(userId) && u.active !== false);
  if (u) response = { success: true, authorized: true, pages: u.pages || '', role: u.role || 'user' };
  else response = { success: false, authorized: false, message: 'Khong co quyen truy cap. Lien he admin.', user_id: userId };
}

else {
  const au = users.find(u => u.telegram_id === String(userId) && u.active !== false);
  if (!au) {
    response = { success: false, error: 'Unauthorized', message: 'Khong co quyen' };
  }
  else if (endpoint === 'products') {
    if (body.name) {
      writeNeeded = true;
      writeUrl = `${BASE}/${T.products}/rows`;
      if (body.id) {
        const existing = products.find(p => p.pid === Number(body.id));
        const pid = existing ? existing.pid : Number(body.id);
        writeBody = { data: [{ pid, name: body.name, unit: body.unit, description: body.description || '', page: existing ? existing.page : (body.page || page), created_at: new Date().toISOString() }] };
      } else {
        const maxPid = products.reduce((max, p) => Math.max(max, p.pid || 0), 0);
        writeBody = { data: [{ pid: maxPid + 1, name: body.name, unit: body.unit, description: body.description || '', page: body.page || page, created_at: new Date().toISOString() }] };
      }
      response = { success: true, message: 'OK' };
    } else {
      response = { success: true, data: products.filter(p => p.page === page).map(p => ({ id: p.pid, name: p.name, unit: p.unit, description: p.description, page: p.page, created_at: p.created_at })) };
    }
  }
  else if (endpoint === 'transactions') {
    if (body.type) {
      writeNeeded = true;
      writeUrl = `${BASE}/${T.trans}/rows`;
      writeBody = { data: [{ type: body.type, product_id: body.product_id, quantity: Number(body.quantity) || 0, note: body.note || '', page: body.page || page, user: body.user || '', timestamp: body.timestamp || new Date().toISOString() }] };
      response = { success: true, message: 'OK' };
    } else {
      response = { success: true, data: transactions.filter(t => t.page === page) };
    }
  }
  else if (endpoint === 'inventory') {
    const pt = transactions.filter(t => t.page === page);
    const inv = {};
    pt.forEach(t => {
      const p = String(t.product_id);
      if (!inv[p]) inv[p] = 0;
      inv[p] += t.type === 'nhap' ? (Number(t.quantity)||0) : -(Number(t.quantity)||0);
    });
    response = { success: true, data: Object.entries(inv).map(([product_id, quantity]) => ({ product_id, quantity })) };
  }
  else if (endpoint === 'locations') {
    if (body.name) {
      writeNeeded = true;
      writeUrl = `${BASE}/${T.locations}/rows`;
      if (body.id) {
        const existing = locations.find(l => l.lid === Number(body.id));
        const lid = existing ? existing.lid : Number(body.id);
        writeBody = { data: [{ lid, name: body.name, description: body.description || '', page: existing ? existing.page : (body.page || page), created_at: new Date().toISOString() }] };
      } else {
        const maxLid = locations.reduce((max, l) => Math.max(max, l.lid || 0), 0);
        writeBody = { data: [{ lid: maxLid + 1, name: body.name, description: body.description || '', page: body.page || page, created_at: new Date().toISOString() }] };
      }
      response = { success: true, message: 'OK' };
    } else {
      response = { success: true, data: locations.filter(l => l.page === page).map(l => ({ id: l.lid, name: l.name, description: l.description, page: l.page })) };
    }
  }
  else if (endpoint === 'bandwidth_logs') {
    if (body.location) {
      writeNeeded = true;
      writeUrl = `${BASE}/${T.bwlogs}/rows`;
      writeBody = { data: [{ location: body.location, event_type: body.event_type, network_type: body.network_type, provider: body.provider, bandwidth_change: Number(body.bandwidth_change) || 0, bandwidth_after: Number(body.bandwidth_after) || 0, note: body.note || '', page: body.page || page, user: body.user || '', timestamp: new Date().toISOString() }] };
      response = { success: true, message: 'OK' };
    } else {
      response = { success: true, data: bwLogs.filter(b => b.page === page) };
    }
  }
}

return [{ json: { response, writeNeeded, writeUrl, writeBody } }];
'@

$dtApiKey = $apiKey

$workflow = @{
    name = "XNH-API"
    nodes = @(
        @{
            parameters = @{ httpMethod = "POST"; path = "api"; responseMode = "responseNode"; options = @{} }
            id = "44444444-4444-4444-4444-444444444444"
            webhookId = "44444444-4444-4444-4444-444444444444"
            name = "Webhook POST"
            type = "n8n-nodes-base.webhook"
            typeVersion = 2
            position = @(200, 400)
        },
        @{
            parameters = @{ jsCode = $apiCode; nodeVersion = 2.2 }
            id = "api-handler"
            name = "API Handler"
            type = "n8n-nodes-base.code"
            typeVersion = 2
            position = @(500, 400)
        },
        @{
            parameters = @{
                conditions = @{
                    options = @{ caseSensitive = $true; leftValue = "" }
                    conditions = @(@{
                        id = "write-check"
                        leftValue = "={{`$json.writeNeeded}}"
                        rightValue = $true
                        operator = @{ type = "boolean"; operation = "true" }
                    })
                    combinator = "and"
                }
                options = @{}
            }
            id = "if-write"
            name = "IF Write"
            type = "n8n-nodes-base.if"
            typeVersion = 2
            position = @(800, 400)
        },
        @{
            parameters = @{
                method = "POST"
                url = "={{`$json.writeUrl}}"
                sendHeaders = $true
                headerParameters = @{ parameters = @(@{ name = "X-N8N-API-KEY"; value = $dtApiKey }) }
                sendBody = $true
                specifyBody = "json"
                jsonBody = "={{JSON.stringify(`$json.writeBody)}}"
                options = @{}
            }
            id = "write-db"
            name = "Write DB"
            type = "n8n-nodes-base.httpRequest"
            typeVersion = 4.2
            position = @(1050, 300)
        },
        @{
            parameters = @{
                respondWith = "json"
                responseBody = "={{JSON.stringify(`$('API Handler').first().json.response)}}"
                options = @{
                    responseHeaders = @{ entries = @(
                        @{ name = "Content-Type"; value = "application/json; charset=utf-8" },
                        @{ name = "Access-Control-Allow-Origin"; value = "*" }
                    ) }
                }
            }
            id = "resp"
            name = "Respond JSON"
            type = "n8n-nodes-base.respondToWebhook"
            typeVersion = 1.1
            position = @(1300, 400)
        }
    )
    connections = @{
        "Webhook POST" = @{ main = @(,@(@{ node = "API Handler"; type = "main"; index = 0 })) }
        "API Handler" = @{ main = @(,@(@{ node = "IF Write"; type = "main"; index = 0 })) }
        "IF Write" = @{ main = @(@(@{ node = "Write DB"; type = "main"; index = 0 }), @(@{ node = "Respond JSON"; type = "main"; index = 0 })) }
        "Write DB" = @{ main = @(,@(@{ node = "Respond JSON"; type = "main"; index = 0 })) }
    }
    settings = @{ executionOrder = "v1" }
}

$json = $workflow | ConvertTo-Json -Depth 15 -Compress
$bytes = [System.Text.Encoding]::UTF8.GetBytes($json)

try {
    $resp = Invoke-RestMethod -Uri "$baseUrl/workflows/$wfId" -Method Put -Headers $headers -Body $bytes
    Write-Output "Updated: ID=$($resp.id) Nodes=$($resp.nodes.Count) Active=$($resp.active)"
} catch {
    Write-Output "ERROR: $($_.Exception.Message)"
    if ($_.ErrorDetails) { Write-Output $_.ErrorDetails.Message.Substring(0, [Math]::Min(300, $_.ErrorDetails.Message.Length)) }
}
