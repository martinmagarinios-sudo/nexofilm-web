$body = @{
    object = "whatsapp_business_account"
    entry  = @(
        @{
            id      = "907739118504389"
            changes = @(
                @{
                    value = @{
                        messaging_product = "whatsapp"
                        metadata          = @{
                            display_phone_number = "15551548472"
                            phone_number_id      = "959915567210352"
                        }
                        contacts          = @(
                            @{
                                profile = @{ name = "Martin" }
                                wa_id   = "5491155632244"
                            }
                        )
                        messages          = @(
                            @{
                                from      = "5491155632244"
                                id        = "wamid.HBgLNTQ5MTE1NTYzMjI0NBUCABIYI..."
                                timestamp = "1659972000"
                                type      = "text"
                                text      = @{ body = "hola" }
                            }
                        )
                    }
                    field = "messages"
                }
            )
        }
    )
} | ConvertTo-Json -Depth 6

Write-Host "Enviando POST a webhook..."
try {
    $res = Invoke-RestMethod -Uri "https://nexofilm.com/api/whatsapp" -Method POST -Body $body -ContentType "application/json"
    $res | ConvertTo-Json
}
catch {
    Write-Host "Error POST: $($_.Exception.Message) - $($_.ErrorDetails.Message)"
}
