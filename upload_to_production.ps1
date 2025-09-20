# Production Data Upload Script (PowerShell)
# Upload avatars and microphones to KaraokeHub production via API

param(
    [string]$BaseUrl = "https://your-production-url.com",
    [string]$AuthToken = "your-jwt-token-here"
)

Write-Host "🚀 KaraokeHub Production Data Upload" -ForegroundColor Green
Write-Host "📡 Target: $BaseUrl" -ForegroundColor Cyan
Write-Host ""

# Validate parameters
if ($BaseUrl -like "*your-production-url*") {
    Write-Host "❌ Error: Please provide a valid production URL" -ForegroundColor Red
    Write-Host "Usage: .\upload_to_production.ps1 -BaseUrl 'https://your-app.com' -AuthToken 'your-token'" -ForegroundColor Yellow
    exit 1
}

if ($AuthToken -like "*your-jwt-token*") {
    Write-Host "❌ Error: Please provide a valid JWT token" -ForegroundColor Red
    Write-Host "Get token by logging into production and checking browser dev tools" -ForegroundColor Yellow
    exit 1
}

# Avatar data
$avatars = @(
    @{ id = "alex"; name = "Alex"; description = "A friendly and versatile performer with a warm personality"; type = "basic"; rarity = "common"; imageUrl = "/images/avatar/avatars/alex.png"; price = 0.00; coinPrice = 0; isAvailable = $true; isFree = $true },
    @{ id = "blake"; name = "Blake"; description = "A confident artist with modern style and great stage presence"; type = "basic"; rarity = "common"; imageUrl = "/images/avatar/avatars/blake.png"; price = 0.00; coinPrice = 0; isAvailable = $true; isFree = $true },
    @{ id = "cameron"; name = "Cameron"; description = "A dynamic performer with classic appeal and natural charisma"; type = "basic"; rarity = "common"; imageUrl = "/images/avatar/avatars/cameron.png"; price = 0.00; coinPrice = 0; isAvailable = $true; isFree = $true },
    @{ id = "joe"; name = "Joe"; description = "A reliable and steady performer with authentic charm"; type = "basic"; rarity = "common"; imageUrl = "/images/avatar/avatars/joe.png"; price = 0.00; coinPrice = 0; isAvailable = $true; isFree = $true },
    @{ id = "juan"; name = "Juan"; description = "A passionate singer with vibrant energy and cultural flair"; type = "basic"; rarity = "common"; imageUrl = "/images/avatar/avatars/juan.png"; price = 0.00; coinPrice = 0; isAvailable = $true; isFree = $true },
    @{ id = "kai"; name = "Kai"; description = "A creative artist with unique style and artistic vision"; type = "basic"; rarity = "common"; imageUrl = "/images/avatar/avatars/kai.png"; price = 0.00; coinPrice = 0; isAvailable = $true; isFree = $true },
    @{ id = "onyx"; name = "Onyx"; description = "A bold performer with striking features and commanding presence"; type = "premium"; rarity = "uncommon"; imageUrl = "/images/avatar/avatars/onyx.png"; price = 5.00; coinPrice = 100; isAvailable = $true; isFree = $false },
    @{ id = "tyler"; name = "Tyler"; description = "A versatile entertainer with contemporary appeal and smooth vocals"; type = "premium"; rarity = "uncommon"; imageUrl = "/images/avatar/avatars/tyler.png"; price = 5.00; coinPrice = 100; isAvailable = $true; isFree = $false }
)

# Sample microphones (first few for example - add all 20 as needed)
$microphones = @(
    @{ id = "mic_basic_1"; name = "Basic Mic Silver"; description = "A reliable silver microphone for beginners"; type = "basic"; rarity = "common"; imageUrl = "/images/avatar/parts/microphones/mic_basic_1.png"; price = 0.00; coinPrice = 0; isAvailable = $true; isFree = $true; isUnlockable = $false },
    @{ id = "mic_basic_2"; name = "Basic Mic Black"; description = "A sleek black microphone with good sound quality"; type = "basic"; rarity = "common"; imageUrl = "/images/avatar/parts/microphones/mic_basic_2.png"; price = 0.00; coinPrice = 0; isAvailable = $true; isFree = $true; isUnlockable = $false },
    @{ id = "mic_gold_1"; name = "Golden Classic"; description = "A classic golden microphone with warm, rich tones"; type = "golden"; rarity = "uncommon"; imageUrl = "/images/avatar/parts/microphones/mic_gold_1.png"; price = 0.00; coinPrice = 100; isAvailable = $true; isFree = $false; isUnlockable = $false },
    @{ id = "mic_diamond_1"; name = "Diamond Dynasty"; description = "The ultimate diamond microphone for true karaoke legends"; type = "premium"; rarity = "legendary"; imageUrl = "/images/avatar/parts/microphones/mic_diamond_1.png"; price = 0.00; coinPrice = 1000; isAvailable = $true; isFree = $false; isUnlockable = $false }
)

# Helper function to make API calls
function Invoke-ApiRequest {
    param(
        [string]$Method,
        [string]$Endpoint,
        [object]$Body = $null
    )
    
    $headers = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $AuthToken"
    }
    
    $uri = "$BaseUrl$Endpoint"
    
    try {
        $params = @{
            Uri = $uri
            Method = $Method
            Headers = $headers
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
        }
        
        $response = Invoke-RestMethod @params
        return @{ Success = $true; Data = $response }
    }
    catch {
        $errorMsg = $_.Exception.Message
        if ($_.Exception.Response) {
            $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
            $errorBody = $reader.ReadToEnd()
            $errorMsg += " - $errorBody"
        }
        return @{ Success = $false; Error = $errorMsg }
    }
}

# Upload avatars
Write-Host "✨ Uploading 8 new avatars..." -ForegroundColor Yellow
$avatarResults = @{ Success = @(); Failed = @() }

foreach ($avatar in $avatars) {
    Write-Host "   Uploading avatar: $($avatar.name) ($($avatar.id))" -ForegroundColor White
    
    $result = Invoke-ApiRequest -Method "POST" -Endpoint "/avatars" -Body $avatar
    
    if ($result.Success) {
        $avatarResults.Success += $avatar
        Write-Host "   ✅ Created avatar: $($avatar.name)" -ForegroundColor Green
    } else {
        $avatarResults.Failed += @{ Avatar = $avatar; Error = $result.Error }
        Write-Host "   ❌ Failed to create avatar $($avatar.name): $($result.Error)" -ForegroundColor Red
    }
    
    Start-Sleep -Milliseconds 100
}

Write-Host ""

# Upload microphones
Write-Host "🎤 Uploading microphones..." -ForegroundColor Yellow
$microphoneResults = @{ Success = @(); Failed = @() }

foreach ($microphone in $microphones) {
    Write-Host "   Uploading microphone: $($microphone.name) ($($microphone.rarity))" -ForegroundColor White
    
    $result = Invoke-ApiRequest -Method "POST" -Endpoint "/microphones" -Body $microphone
    
    if ($result.Success) {
        $microphoneResults.Success += $microphone
        Write-Host "   ✅ Created microphone: $($microphone.name)" -ForegroundColor Green
    } else {
        $microphoneResults.Failed += @{ Microphone = $microphone; Error = $result.Error }
        Write-Host "   ❌ Failed to create microphone $($microphone.name): $($result.Error)" -ForegroundColor Red
    }
    
    Start-Sleep -Milliseconds 100
}

Write-Host ""

# Verify upload
Write-Host "🔍 Verifying upload..." -ForegroundColor Yellow

$avatarCheck = Invoke-ApiRequest -Method "GET" -Endpoint "/avatar/all-avatars"
$microphoneCheck = Invoke-ApiRequest -Method "GET" -Endpoint "/avatar/all-microphones"

if ($avatarCheck.Success) {
    Write-Host "✅ Found $($avatarCheck.Data.Count) avatars in production" -ForegroundColor Green
} else {
    Write-Host "❌ Could not verify avatars: $($avatarCheck.Error)" -ForegroundColor Red
}

if ($microphoneCheck.Success) {
    Write-Host "✅ Found $($microphoneCheck.Data.Count) microphones in production" -ForegroundColor Green
    
    # Group by rarity
    $rarityGroups = $microphoneCheck.Data | Group-Object rarity
    Write-Host "📊 Microphones by rarity:" -ForegroundColor Cyan
    foreach ($group in $rarityGroups) {
        Write-Host "   $($group.Name): $($group.Count)" -ForegroundColor White
    }
} else {
    Write-Host "❌ Could not verify microphones: $($microphoneCheck.Error)" -ForegroundColor Red
}

Write-Host ""

# Summary
Write-Host "📋 Upload Summary:" -ForegroundColor Yellow
Write-Host "✨ Avatars: $($avatarResults.Success.Count) created, $($avatarResults.Failed.Count) failed" -ForegroundColor White
Write-Host "🎤 Microphones: $($microphoneResults.Success.Count) created, $($microphoneResults.Failed.Count) failed" -ForegroundColor White

if ($avatarResults.Failed.Count -gt 0 -or $microphoneResults.Failed.Count -gt 0) {
    Write-Host ""
    Write-Host "❌ Some uploads failed. Check the logs above for details." -ForegroundColor Red
    Write-Host "   You may need to implement missing endpoints or adjust the data format." -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "🎉 All uploads completed successfully!" -ForegroundColor Green
}

Write-Host ""
Write-Host "📋 Usage:" -ForegroundColor Yellow
Write-Host ".\upload_to_production.ps1 -BaseUrl 'https://your-app.com' -AuthToken 'your-jwt-token'" -ForegroundColor White