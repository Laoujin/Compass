#Requires -Version 5.1
<#
.SYNOPSIS
    Serve the live Compass gallery: an interactive layout/card/palette picker
    that builds each combo on demand and rebuilds on every refresh.

.DESCRIPTION
    Thin launcher for gallery-server.py — picks the available Python and forwards
    the port. The server builds each skeleton x card combo only when you view it
    (no 42-combo upfront wait) and rebuilds from source on refresh, so edits show
    up immediately. Needs Docker (builds run in ruby:3.3 with a cached bundle volume).

.EXAMPLE
    .\serve.ps1
    # http://localhost:4000/

.EXAMPLE
    .\serve.ps1 -Port 8080
#>
[CmdletBinding()]
param(
    [int]$Port = 4000
)

$ErrorActionPreference = 'Stop'

$pythonCmd = if (Get-Command py -ErrorAction SilentlyContinue) { 'py' } else { 'python' }
$env:PORT = "$Port"
& $pythonCmd (Join-Path $PSScriptRoot 'gallery-server.py')
