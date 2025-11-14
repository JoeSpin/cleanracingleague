# Upload ARCA data using Invoke-WebRequest

$csvData = "Track,Date,Winner,P2,P3,P4,P5,P6,P7,P8,P9,P10,P11,P12,P13,P14,P15,P16,P17,P18,P19,P20,P21,P22,P23,P24,P25,P26,P27,P28,P29,P30`nDaytona International Speedway,Sep 10 2025,Evan Kinney,Jose Sanchez,RnD Garage,Kyle Haas,Conor MacDonald,Dylan Zoccola,Zach Eaves,Ricky Robinson,Sway D Train,Quinn McGraw,Joseph Pence,Kermit Wheeler,Lucas Ellis,Jake Burch,TJ Williams,Tim Elmore,Dan Malone,Jarrod Mullins,Ethan Adams,Casey Harper,Jesper Olsson,JR McKusker,Denny Halpin,Alex Orsini,Jack Scheller,Sebastian Montoya,Trent Slater,Joesph Spada,Adam Wilson,AJ Pedroza"

$body = @{
    csvData = $csvData
    series = "ARCA"
    season = "CRL ARCA SEASON 2"
    playoffRound = "regular"
}

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/upload-race" -Method POST -Body $body
    Write-Host "Upload successful!"
    Write-Host "Response: $($response | ConvertTo-Json)"
} catch {
    Write-Host "Error uploading: $($_.Exception.Message)"
}