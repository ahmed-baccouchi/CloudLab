# CloudLab Production & Cluster Health Verification Script
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "CloudLab Deployment Verification & Health Smoke Test" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$services = @(
    @{ Name = "API Gateway";            Url = "http://localhost:4000/health" },
    @{ Name = "Auth Service";           Url = "http://localhost:4001/health" },
    @{ Name = "Learning Service";       Url = "http://localhost:4002/health" },
    @{ Name = "Progress Service";       Url = "http://localhost:4004/health" },
    @{ Name = "Project Service";        Url = "http://localhost:4005/health" },
    @{ Name = "Communication Service";  Url = "http://localhost:4006/health" },
    @{ Name = "Frontend UI";            Url = "http://localhost:80" }
)

Write-Host "`n1. Checking Service Health Endpoints..." -ForegroundColor Yellow
$allPassed = $true

foreach ($svc in $services) {
    try {
        $res = Invoke-WebRequest -Uri $svc.Url -Method Get -TimeoutSec 5 -ErrorAction Stop
        if ($res.StatusCode -eq 200) {
            Write-Host " [PASS] $($svc.Name) is healthy (Status: $($res.StatusCode))" -ForegroundColor Green
        } else {
            Write-Host " [WARN] $($svc.Name) returned status $($res.StatusCode)" -ForegroundColor Yellow
            $allPassed = $false
        }
    } catch {
        Write-Host " [FAIL] $($svc.Name) ($($svc.Url)) is unreachable" -ForegroundColor Red
        $allPassed = $false
    }
}

Write-Host "`n2. Checking Kubernetes Pods (if cluster running)..." -ForegroundColor Yellow
try {
    $pods = kubectl get pods -n cloudlab -o wide
    if ($LASTEXITCODE -eq 0) {
        Write-Host $pods
    } else {
        Write-Host " Kubernetes cluster not currently connected or namespace not created." -ForegroundColor Gray
    }
} catch {
    Write-Host " kubectl not connected." -ForegroundColor Gray
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host " All CloudLab services are HEALTHY & OPERATIONAL! " -ForegroundColor Green
} else {
    Write-Host " One or more services are not yet running or healthy. " -ForegroundColor Yellow
}
Write-Host "==========================================================" -ForegroundColor Cyan
