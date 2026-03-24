$apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYTA2ZGNiNi0zMzJiLTRhY2UtOGFjMi1jZDZmZDUzZTQ2ODEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWRkZWFiZWEtYTllNi00Mzg0LThkYWEtYTUxNTk0ZTkxNWU0IiwiaWF0IjoxNzc0Mjc2ODU5fQ.HdCV3HEarR7TiVJ-V2CxwjD6W0tS4GoDLrync_iiV0Y"
$baseUrl = "https://n8n.tayninh.cloud/api/v1"
$headers = @{ "X-N8N-API-KEY" = $apiKey; "Content-Type" = "application/json; charset=utf-8" }
$wfId = "8iyzBGUNmyBzsIYx"

Write-Output "=== Deploying XNH-Frontend (Claymorphic Theme) ==="

$html = [System.IO.File]::ReadAllText("C:\Users\Pinus\Documents\telegram-mini-app\dist\XuatNhapHang.html", [System.Text.Encoding]::UTF8)

$feWorkflow = @{
    name = "XNH-Frontend"
    nodes = @(
        @{
            parameters = @{ httpMethod = "GET"; path = "app"; responseMode = "responseNode"; options = @{} }
            id = "11111111-1111-1111-1111-111111111111"
            webhookId = "11111111-1111-1111-1111-111111111111"
            name = "Webhook"
            type = "n8n-nodes-base.webhook"
            typeVersion = 2
            position = @(250, 300)
        },
        @{
            parameters = @{
                respondWith = "text"
                responseBody = $html
                options = @{
                    responseHeaders = @{ entries = @(@{ name = "Content-Type"; value = "text/html; charset=utf-8" }) }
                }
            }
            id = "respond-html"
            name = "Respond HTML"
            type = "n8n-nodes-base.respondToWebhook"
            typeVersion = 1.1
            position = @(500, 300)
        }
    )
    connections = @{
        "Webhook" = @{ main = @(,@(@{ node = "Respond HTML"; type = "main"; index = 0 })) }
    }
    settings = @{ executionOrder = "v1" }
}

$json = $feWorkflow | ConvertTo-Json -Depth 15 -Compress
$bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
try {
    $resp = Invoke-RestMethod -Uri "$baseUrl/workflows/$wfId" -Method Put -Headers $headers -Body $bytes
    Write-Output "Updated: ID=$($resp.id), Active=$($resp.active)"
    if (-not $resp.active) {
        $act = Invoke-RestMethod -Uri "$baseUrl/workflows/$wfId/activate" -Method Post -Headers $headers
        Write-Output "Activated: $($act.active)"
    }
    Write-Output "=== Deploy OK! ==="
} catch {
    Write-Output "ERROR: $($_.Exception.Message)"
    if ($_.ErrorDetails) { Write-Output $_.ErrorDetails.Message.Substring(0, [Math]::Min(500, $_.ErrorDetails.Message.Length)) }
}
