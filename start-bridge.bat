@echo off
echo Starting Claude Orchestrator Bridge...
cd /d "%~dp0bridge"
npm install --silent
node server.js
