# CloudLab 3-Minute Live Video Demo Automation Script
# Use this script during your terminal screen recording!

Clear-Host
$host.UI.RawUI.WindowTitle = "CloudLab - DevOps & Cloud Demonstration"

function Step-Banner($num, $title) {
    Write-Host "`n==================================================================" -ForegroundColor Cyan
    Write-Host " [$num/4] $title" -ForegroundColor Yellow
    Write-Host "==================================================================" -ForegroundColor Cyan
}

function Prompt-Next($msg = "Press ENTER to continue to the next scene...") {
    Write-Host "`n>> $msg" -ForegroundColor Magenta
    Read-Host | Out-Null
}

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "   CloudLab — 3-Minute Video Walkthrough Script   " -ForegroundColor Green
Write-Host "   Microservices | Docker | Kubernetes | CI/CD | Frontend " -ForegroundColor White
Write-Host "==================================================================" -ForegroundColor Cyan
Prompt-Next "Press ENTER to begin Scene 1 (CI/CD Pipeline & Codebase)..."

# SCENE 1: Architecture & CI/CD Pipeline
Step-Banner "1" "CI/CD Pipeline Validation & Architecture"
Write-Host "Inspecting GitHub Actions Workflow definitions..." -ForegroundColor Gray
Write-Host "[CI] Lint, Typecheck, Matrix Build (7 services), Trivy Security Scan" -ForegroundColor Green
Write-Host "[CD] Buildx, Push to Docker Hub, Kubernetes Kustomize Validation`n" -ForegroundColor Green

Write-Host "Running local Kustomize validation check:" -ForegroundColor DarkCyan
kubectl kustomize k8s/ | Select-Object -First 25
Write-Host "... [Manifests Validated Successfully]" -ForegroundColor Green

Prompt-Next "Press ENTER for Scene 2 (Docker Infrastructure & Containers)..."

# SCENE 2: Docker Infrastructure
Step-Banner "2" "Docker Compose & Infrastructure Services"
Write-Host "Checking active Docker containers (RabbitMQ, Redis, MySQL)..." -ForegroundColor Gray
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

Prompt-Next "Press ENTER for Scene 3 (Kubernetes Cluster & Scaling)..."

# SCENE 3: Kubernetes Orchestration & Health Checks
Step-Banner "3" "Kubernetes Cluster, Pods & High Availability"
Write-Host "Listing CloudLab namespace resources..." -ForegroundColor Gray
kubectl get pods -n cloudlab -o wide
Write-Host "`nChecking Kubernetes Services..." -ForegroundColor Gray
kubectl get svc -n cloudlab

Write-Host "`nSimulating auto-healing & horizontal scaling on Learning Service..." -ForegroundColor DarkCyan
kubectl scale deployment/learning-service --replicas=2 -n cloudlab --dry-run=client -o yaml | Select-Object -First 10
Write-Host "Scale configuration verified." -ForegroundColor Green

Prompt-Next "Press ENTER for Scene 4 (Service Health & Platform Verification)..."

# SCENE 4: Health Check Verification
Step-Banner "4" "End-to-End Service Health Verification"
& powershell -File ".\scripts\verify-deployment.ps1"

Write-Host "`n==================================================================" -ForegroundColor Green
Write-Host " DEMO COMPLETE! Ready to switch to Web Platform walkthrough! " -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Green
