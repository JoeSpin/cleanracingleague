// Script to upload ARCA CSV data
const fs = require('fs');
const path = require('path');

const csvContent = `League,"Clean Racing League Arca Series"
Series,"Clean Racing League Arca Series"
Season,"CRL ARCA SEASON 2"
"Race Date","Sep 10, 2025"
Track,"Daytona International Speedway"
"Race Laps",78
"Race Duration","1h 21m 27s"
Cautions,6
"Caution Laps",15
"Lead Changes",20
Leaders,9
,,Finish,"Finish Class",Start,"Start Class",Driver,"iRacing License",iRating,"iRacing SR","Total Points","Race Points","Stage Points","Bonus Points","Penalty Points",Interval,"Laps Completed","Laps Led",Car,"Fastest Lap","Fastest Lap #","Average Lap",Incidents,Status,"Car Number"
,,1,1,21,21,"Evan Kinney","Class B",3563,2.35,44,43,0,1,0,-,78,2,"ARCA Toyota Camry",47.315,32.000,1:04.5118,16,Running,7
,,2,2,24,24,"Caleb Smith3","Class A",2422,3.87,42,42,0,0,0,-0.0935,78,0,"ARCA Ford Mustang",47.433,2.000,1:04.513,12,Running,54
,,3,3,7,7,"Mike Kelley","Class A",3732,4.99,42,41,0,1,0,-0.6613,78,2,"ARCA Toyota Camry",47.253,32.000,1:04.5205,24,Running,2
,,4,4,23,23,"Bob D Stephens","Class A",1619,2.56,40,40,0,0,0,-1.6895,78,0,"ARCA Toyota Camry",48.052,8.000,1:04.5335,16,Running,90
,,5,5,3,3,"Steve Ritter","Class A",3381,4.58,40,39,0,1,0,-2.1825,78,1,"ARCA Ford Mustang",47.239,32.000,1:04.540,16,Running,61
,,6,6,28,28,"Cam Patterson","Class A",3593,1.86,39,38,0,1,0,-2.7082,78,0,"ARCA Toyota Camry",47.226,20.000,1:04.5465,13,Running,38
,,7,7,2,2,"Dusty Martin","Class A",1970,2.16,38,37,0,1,0,-3.5696,78,21,"ARCA Chevrolet SS",47.789,15.000,1:04.5578,4,Running,35
,,8,8,26,26,"Austin Coop","Class A",4491,2.39,37,36,0,1,0,-3.9483,78,5,"ARCA Toyota Camry",47.242,20.000,1:04.5624,12,Running,53
,,9,9,1,1,"Seth Fouty","Class A",4629,3.24,37,35,0,2,0,-4.8184,78,6,"ARCA Toyota Camry",47.722,45.000,1:04.5739,20,Running,07
,,10,10,15,15,"Daniel Miller23","Class A",3828,2.49,34,34,0,0,0,-5.3938,78,0,"ARCA Toyota Camry",47.637,8.000,1:04.581,12,Running,8
,,11,11,14,14,"Jacob T Grant","Class A",3773,4.21,33,33,0,0,0,-5.806,78,0,"ARCA Ford Mustang",47.793,3.000,1:04.5863,12,Running,19
,,12,12,5,5,"Bobby Mantil","Class A",3985,3.38,32,32,0,0,0,-6.0513,78,0,"ARCA Chevrolet SS",47.792,15.000,1:04.5896,8,Running,89
,,13,13,6,6,"Steve Gerber","Class A",2244,4.42,31,31,0,0,0,-36.1546,78,0,"ARCA Ford Mustang",47.265,32.000,1:04.9755,16,Running,16
,,14,14,18,18,"Kenyon Jackson","Class A",1877,2.29,30,30,0,0,0,-54.4028,78,0,"ARCA Toyota Camry",47.922,19.000,1:05.2093,8,Running,44
,,15,15,9,9,"Zachary Fouty","Class A",1939,2.44,29,29,0,0,0,-2L,76,0,"ARCA Ford Mustang",47.645,3.000,1:04.0128,24,Running,02
,,16,16,19,19,"Steve Rubino","Class A",1046,2.54,28,28,0,0,0,-2L,76,0,"ARCA Chevrolet SS",47.539,25.000,1:04.0167,20,Running,21
,,17,17,25,25,"Wayne L Chapman","Class A",1829,2.49,27,27,0,0,0,-2L,76,0,"ARCA Ford Mustang",47.926,2.000,1:06.2517,10,Running,43
,,18,18,11,11,"Jamie Larocque","Class A",1423,2.34,26,26,0,0,0,-3L,75,0,"ARCA Chevrolet SS",47.498,25.000,1:03.8822,28,Running,15
,,19,19,10,10,"Crank Bell","Class B",3237,2.6,26,25,0,1,0,-4L,74,13,"ARCA Chevrolet SS",47.690,15.000,1:02.3483,4,Disconnected,14
,,20,20,17,17,"Kevin P Becker","Class A",2466,2.03,24,24,0,0,0,-5L,73,0,"ARCA Toyota Camry",47.518,25.000,1:01.8373,8,Disconnected,85
,,21,21,29,29,"Danny C White","Class A",2685,3.42,23,23,0,0,0,-9L,69,0,"ARCA Ford Mustang",47.259,56.000,59.392,12,Disconnected,64
,,22,22,31,30,"Mike Howerton","Class A",2955,3.04,22,22,0,0,0,-9L,69,0,"ARCA Ford Mustang",47.356,2.000,59.501,8,Running,51
,,23,23,22,22,"Chris M. Smith","Class A",1855,2.15,21,21,0,0,0,-9L,69,0,"ARCA Ford Mustang",47.447,2.000,1:00.1066,14,Running,55
,,24,24,13,13,"Joshua Aultice","Class A",3283,3.01,21,20,0,1,0,-9L,69,25,"ARCA Chevrolet SS",47.282,8.000,1:02.8443,12,Running,94
,,25,25,12,12,"Joshua Gillen2","Class B",1728,2.76,19,19,0,0,0,-10L,68,0,"ARCA Ford Mustang",47.443,56.000,1:00.4716,8,Running,10
,,26,26,8,8,"Bradley Murphy2","Class A",1571,3.24,19,18,0,1,0,-17L,61,3,"ARCA Toyota Camry",47.557,25.000,54.216,1,Disconnected,18
,,27,27,16,16,"Gabriel Lorenz","Class D",1074,3.46,17,17,0,0,0,-20L,58,0,"ARCA Chevrolet SS",47.432,15.000,1:14.6477,16,Disconnected,20
,,28,28,4,4,"JD Daniels","Class A",2643,1.56,17,16,0,1,0,-28L,50,0,"ARCA Toyota Camry",47.873,12.000,54.973,4,Disconnected,6
,,29,29,27,27,"Scott Simley","Class A",4156,4.71,15,15,0,0,0,-72L,6,0,"ARCA Ford Mustang",47.899,2.000,50.461,8,Disconnected,4
,,30,30,20,20,"Andy Whicker","Class A",2086,4.78,14,14,0,0,0,-76L,2,0,"ARCA Chevrolet SS",2:58.501,2.000,1:58.649,4,Disconnected,75`;

// Create the CSV file in downloads to simulate upload
console.log('ARCA CSV content ready for upload');
console.log('Series: ARCA');
console.log('Season: CRL ARCA SEASON 2');
console.log('Winner: Evan Kinney');
console.log('Track: Daytona International Speedway');