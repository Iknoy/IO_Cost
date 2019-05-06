window.addEventListener('load', init, false);

let filename = '';

function init() {
    document.getElementById('showPlan').addEventListener('change', loadFile, false);
    document.getElementById('table_dis').style.display = 'none';
    document.getElementById('showPlanVisor').style.display = 'none';
}

function loadFile(ev) {
    filename = ev.target.files[0].name;
    document.getElementById('dataFile').innerHTML	= 'Nombre del archivo: '+filename+'<br>'
                                                            + 'Tama\u00F1o del archivo: '+ev.target.files[0].size+' bytes';

    let fileRead = new FileReader();
    fileRead.addEventListener('load',readFile,false);
    fileRead.readAsText(ev.target.files[0]);

    document.getElementById('info_dis').style.display = 'none';
    document.getElementById('table_dis').style.display = 'block';
    document.getElementById('showPlanVisor').style.display = 'block';
}

function readFile(ev) {
    const array = ev.target.result.split("): ");
    const arrayScan = ev.target.result.split("QUERY PLAN FOR STATEMENT ");
    const arrayIos = ev.target.result.split("Total estimated I/O cost for");
    let i, j, k;
    let l = 0;
    let sumIO = 0;
    let scanTable = [];		// [Line][Table]
    let scanIndex = [];		// [Line][Table][Index]
    let costIO = [];		// [Line][I/O]
    let colAssembly = [];	// [Line][I/O][Full scan Table][Index Table]
    let tableStructure   = '<tr class="text-center colorBR" >' +
                        '<th>L\u00EDnea dentro del SP </th>' +
                        '<th>Coste de I/O Estimado </th>' +
                        '<th>Tablas Escaneadas</th>' +
                        '<th>Escaneos con \u00EDndices</th></tr>';

    //Sum of I/O Cost
    for(i=0; i<array.length; i++){
        sumIO += isNaN(parseInt(array[i]))?0:parseInt(array[i]);
    }
    //I/O quantity per block
    for(k=1; k<arrayIos.length; k++){
        let statement = arrayIos[k].substring(arrayIos[k].indexOf('):'), arrayIos[k].indexOf('.')).replace('): ', '');
        if (parseInt(statement)>0){
            let tempLine = arrayIos[k].substring(arrayIos[k].indexOf('at line'),arrayIos[k].indexOf('):')).replace('at line ','');
            let tempIO = arrayIos[k].substring(arrayIos[k].indexOf('):'),arrayIos[k].indexOf('.')).replace('): ','');
            costIO.push([tempLine,tempIO]);
        }
    }
    // Detection of tables
    for(j=0; j<arrayScan.length; j++){
        // Detection of scanned tables
        if(arrayScan[j].indexOf('Table Scan.')>=0){
            let lineScanTab = arrayScan[j].substring(arrayScan[j].indexOf('line '),arrayScan[j].indexOf(')')).replace('line ','');//linea
            let nameScanTab = arrayScan[j].split('FROM TABLE');
            let tmpScanTab;
            for(k=0; k<nameScanTab.length; k++){
                if(nameScanTab[k].indexOf('Table Scan.')>=0){
                    l=0;
                    while(nameScanTab[k][l] === ' ' || nameScanTab[k][l] === '|'){
                        l++;
                    }
                    tmpScanTab = nameScanTab[k].substring(l,nameScanTab[k].indexOf('Table Scan.')).replace(/\|/g,'');
                    scanTable.push([lineScanTab, tmpScanTab]);
                }
            }
        }
        // Detection of index tables
        else if(arrayScan[j].indexOf('Forward Scan.')>=0){
            let lineFwTab = arrayScan[j].substring(arrayScan[j].indexOf('line '),arrayScan[j].indexOf(')')).replace('line ','');
            let nameFwTabs = arrayScan[j].split('FROM TABLE');
            let tmpFwScanTables;
            let tmpIndex;
            let tmpIndexKeys;
            for(k=0; k<nameFwTabs.length; k++){
                if(nameFwTabs[k].indexOf('Forward Scan.')>=0){
                    l=0;
                    while(nameFwTabs[k][l] === ' ' || nameFwTabs[k][l] === '|'){
                        l++;
                    }
                    if(nameFwTabs[k].indexOf('Clustered')>=0){
                        tmpFwScanTables = nameFwTabs[k].substring(l,nameFwTabs[k].indexOf('Using')).replace(/\|/g,'');
                        tmpIndex = nameFwTabs[k].substring(nameFwTabs[k].indexOf('Index :'),nameFwTabs[k].indexOf('Forward Scan.')).replace('Index : ','').replace(/\|/g,'');
                        if(nameFwTabs[k].indexOf('Keys are:')>=0){
                            tmpIndexKeys = nameFwTabs[k].substring(nameFwTabs[k].indexOf('Keys are:'),nameFwTabs[k].indexOf('Using I/O')).replace('Keys are:','').replace(/\|/g,'');
                        }else{
                            tmpIndexKeys = 'N/A';
                        }

                        scanIndex.push([lineFwTab,tmpFwScanTables,tmpIndex,tmpIndexKeys]);
                    }
                    else{
                        tmpFwScanTables = nameFwTabs[k].substring(l,nameFwTabs[k].indexOf('Index')).replace(/\|/g,'');
                        tmpIndex = nameFwTabs[k].substring(nameFwTabs[k].indexOf('Index :'),nameFwTabs[k].indexOf('Forward Scan.')).replace('Index : ','').replace(/\|/g,'');
                        if(nameFwTabs[k].indexOf('Keys are:')>=0){
                            tmpIndexKeys = nameFwTabs[k].substring(nameFwTabs[k].indexOf('Keys are:'),nameFwTabs[k].indexOf('Using I/O')).replace('Keys are:','').replace(/\|/g,'');
                        }else{
                            tmpIndexKeys = 'N/A';
                        }
                        scanIndex.push([lineFwTab,tmpFwScanTables,tmpIndex,tmpIndexKeys]);
                    }
                }
            }
        }
    }
    if(scanTable === null){
        scanTable = 'No scan';
    }
// [Line][I/O][Full scan Table][Index Table]
    for(i=0; i<costIO.length; i++){
        let tempLinea = '<td class="text-info text-center align-middle" id="linea">' + costIO[i][0] + '</td>';
        let tmpIOCost = parseInt(costIO[i][1],10);
        let tmpIOCostFormat;
        let tmpTabScan = '';
        let tmpFwScan = '';

        // Column filling for I/O cost
        if (tmpIOCost >= 1000000){
            tmpIOCostFormat = '<td class="text-danger text-center align-middle">' + tmpIOCost.toLocaleString('es-MX') + '</td>';
        }else if (tmpIOCost >= 500000 && tmpIOCost < 1000000){
            tmpIOCostFormat = '<td class="text-warning text-right align-middle">' + tmpIOCost.toLocaleString('es-MX') + '</td>';
        }else {
            tmpIOCostFormat = '<td class="text-right align-middle">' + tmpIOCost.toLocaleString('es-MX') + '</td>';
        }
        // Column filling for scanned tables.
        for(j=0; j<scanTable.length; j++){
            if (costIO[i][0] === scanTable[j][0]){
                if (scanTable[j][1].indexOf('#')>=0){ //# is for tmp tables
                    tmpTabScan = '<td>' + scanTable[j][1] + '</td>';
                }else{
                    tmpTabScan = '<td class="text-danger text-center">' + scanTable[j][1] + '</td>';
                }
            }
        }
        // Column filling for index scan.
        for(j=0; j<scanIndex.length; j++){
            if (costIO[i][0] === scanIndex[j][0]){
                tmpFwScan	= '<td class="text-monospace" id="interCell">'
                            + '<p class="text-white-50 headers"><strong class="font-weight-bold text-white">Tabla:  </strong>' + scanIndex[j][1] + '</p>'
                            + '<p class="text-white-50 headers"><strong class="font-weight-bold text-white">Indice: </strong>' + scanIndex[j][2] + '</p>'
                            + '<p class="text-white-50 headers"><strong class="font-weight-bold text-white">Llaves: </strong>' + scanIndex[j][3] + '</p></td>';
            }
        }
        colAssembly.push([tempLinea,tmpIOCostFormat, tmpTabScan,tmpFwScan]);
    }
    //Creation of the table to be displayed
    for (i=0; i<colAssembly.length; i++){

        tableStructure += '<tr>';

        for (j=0; j<colAssembly[i].length; j++){
            if (colAssembly[i][j].indexOf('td')>=0){
                tableStructure += colAssembly[i][j];
            }else{
                tableStructure += '<td></td>';
            }
        }

        tableStructure += '</tr>'
    }
    document.getElementById('showPlanVisor').value = ev.target.result;
    document.getElementById('totalCost').innerHTML =   '<h2 class="text-center">' +
                                                                    '<b>Costo total estimado: </b><br>' +
                                                                        '<small>' +
                                                                            sumIO.toLocaleString('es-MX') +
                                                                        '</small>' +
                                                                '</h2>';
    document.getElementById('showPlanTable').innerHTML= tableStructure;
}

function downloadCSV(csv, filename) {
    let csvFile;
    let downloadLink;

    // CSV file
    csvFile = new Blob([csv], {type: "text/csv"});

    // Download link
    downloadLink = document.createElement("a");

    // File name
    downloadLink.download = filename;

    // Create a link to the file
    downloadLink.href = window.URL.createObjectURL(csvFile);

    // Hide download link
    downloadLink.style.display = "none";

    // Add the link to DOM
    document.body.appendChild(downloadLink);

    // Click download link
    downloadLink.click();
}

function exportTableToCSV() {
    let i, j;
    let csv = [];
    let output = 'I/O_Cost_' + filename;
    let rows = document.querySelectorAll("table tr");
    let row, cols;

    for (i = 0; i < rows.length; i++) {
        row = [];
        cols = rows[i].querySelectorAll("td, th");

        for (j = 0; j < cols.length; j++){
            row.push('"' + cols[j].innerText + '"');
        }

        csv.push(row.join(","));
    }

    // Download CSV file
    downloadCSV(csv.join("\n"), output);
}