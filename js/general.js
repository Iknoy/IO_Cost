window.addEventListener('load', inicio, false);

var filename = '';

function inicio() {
    document.getElementById('showPlan').addEventListener('change', loadFile, false);
    document.getElementById('table_dis').style.display = 'none';
    document.getElementById('editor').style.display = 'none';
}

function loadFile(ev) {
    filename = ev.target.files[0].name;
    document.getElementById('dataFile').innerHTML	= 'Nombre del archivo: '+filename+'<br>'
                                                            + 'Tama\u00F1o del archivo: '+ev.target.files[0].size+' bytes';

    let arch = new FileReader();
    arch.addEventListener('load',readFile,false);
    arch.readAsText(ev.target.files[0]);

    document.getElementById('info_dis').style.display = 'none';
    document.getElementById('table_dis').style.display = 'block';
    document.getElementById('editor').style.display = 'block';
}

function readFile(ev) {
    const array = ev.target.result.split("): ");
    const arrayScan = ev.target.result.split("QUERY PLAN FOR STATEMENT ");
    const arrayIos = ev.target.result.split("Total estimated I/O cost for");
    let i, j, k;
    let l = 0;
    let scanTable = [];		// [Línea][Tabla]
    let scanIndex = [];		// [Línea][Tabla][Indices]
    let costIO = [];		// [Línea][I/O]
    let colAssembly = [];	// [Línea][I/O][Tabla Full scan][Tabla con indice][Indices]
    let colHeaders   = '<tr class="text-center naranjaBR" >' +
                        '<th>L\u00EDnea dentro del SP </th>' +
                        '<th>Coste de I/O Estimado </th>' +
                        '<th>Tablas Escaneadas</th>' +
                        '<th>Escaneos con \u00EDndices</th></tr>';

    let statement;
    let sumIO = 0;

    //Sum of I/O Cost
    for(i=0; i<array.length; i++){
        sumIO += isNaN(parseInt(array[i]))?0:parseInt(array[i]);
    }
    //I/O quantity per block
    for(k=1; k<arrayIos.length; k++){
        statement = arrayIos[k].substring(arrayIos[k].indexOf('):'), arrayIos[k].indexOf('.')).replace('): ', '');
        if (parseInt(statement)>0){
            var tempLine = arrayIos[k].substring(arrayIos[k].indexOf('at line'),arrayIos[k].indexOf('):')).replace('at line ','');
            var tempIO = arrayIos[k].substring(arrayIos[k].indexOf('):'),arrayIos[k].indexOf('.')).replace('): ','');
            costIO.push([tempLine,tempIO]);
        }
    }
    //Identificación de Tabla
    for(j=0; j<arrayScan.length; j++){
        //Identificar Tabla Simple
        if(arrayScan[j].indexOf('Table Scan.')>=0){
            var linea = arrayScan[j].substring(arrayScan[j].indexOf('line '),arrayScan[j].indexOf(')')).replace('line ','');//linea
            var arrayAux = arrayScan[j].split('FROM TABLE');
            for(k=0; k<arrayAux.length; k++){
                if(arrayAux[k].indexOf('Table Scan.')>=0){
                    l=0;
                    while(arrayAux[k][l] === ' ' || arrayAux[k][l] === '|'){
                        l++;
                    }
                    var tempScan = arrayAux[k].substring(l,arrayAux[k].indexOf('Table Scan.')).replace(/\|/g,'');
                    scanTable.push([linea, tempScan]);
                }
            }
        }
        //Identificar Tablas con Indices
        else if(arrayScan[j].indexOf('Forward Scan.')>=0){
            var lineaFW = arrayScan[j].substring(arrayScan[j].indexOf('line '),arrayScan[j].indexOf(')')).replace('line ','');//linea
            var arrayFW = arrayScan[j].split('FROM TABLE');
            for(k=0; k<arrayFW.length; k++){
                if(arrayFW[k].indexOf('Forward Scan.')>=0){
                    l=0;
                    while(arrayFW[k][l] === ' ' || arrayFW[k][l] === '|'){
                        l++;
                    }
                    if(arrayFW[k].indexOf('Clustered')>=0){
                        var tempTab = arrayFW[k].substring(l,arrayFW[k].indexOf('Using')).replace(/\|/g,''); //Tabla
                        var tempInd = arrayFW[k].substring(arrayFW[k].indexOf('Index :'),arrayFW[k].indexOf('Forward Scan.')).replace('Index : ','').replace(/\|/g,'');//index
                        if(arrayFW[k].indexOf('Keys are:')>=0){
                            var tempKey = arrayFW[k].substring(arrayFW[k].indexOf('Keys are:'),arrayFW[k].indexOf('Using I/O')).replace('Keys are:','').replace(/\|/g,'');//Llaves
                        }else{
                            var tempKey = 'N/A';
                        }

                        scanIndex.push([lineaFW,tempTab,tempInd,tempKey]);
                    }
                    else{
                        var tempTab = arrayFW[k].substring(l,arrayFW[k].indexOf('Index')).replace(/\|/g,'');
                        var tempInd = arrayFW[k].substring(arrayFW[k].indexOf('Index :'),arrayFW[k].indexOf('Forward Scan.')).replace('Index : ','').replace(/\|/g,'');//index
                        if(arrayFW[k].indexOf('Keys are:')>=0){
                            var tempKey = arrayFW[k].substring(arrayFW[k].indexOf('Keys are:'),arrayFW[k].indexOf('Using I/O')).replace('Keys are:','').replace(/\|/g,'');//Llaves
                        }else{
                            var tempKey = 'N/A';
                        }
                        scanIndex.push([lineaFW,tempTab,tempInd,tempKey]);
                    }
                }
            }
        }
    }
    if(scanTable == ''){
        scanTable = 'No scan';
    }
// [Línea][I/O][Tabla Full scan][Tabla con indice][Indices]
    for(i=0; i<costIO.length; i++){
        var tempTscan = '';
        var tempFscan = '';
        var tempLinea = '<td class="text-info" id="linea">' + costIO[i][0] + '</td>';
        var tempIOcos = parseInt(costIO[i][1],10);
        var tempIOcosFormat;
        var tempIONum;

        // Column filling for I/O cost
        if (tempIOcos >= 1000000){
            tempIOcosFormat = tempIOcos.toLocaleString('es-MX');
            tempIONum= '<td class="text-danger">' + tempIOcosFormat + '</td>';
        }else if (tempIOcos >= 500000 && tempIOcos < 1000000){
            tempIOcosFormat = tempIOcos.toLocaleString('es-MX');
            tempIONum = '<td class="text-warning">' + tempIOcosFormat + '</td>';
        }else {
            tempIOcosFormat = tempIOcos.toLocaleString('es-MX');
            tempIONum = '<td>' + tempIOcosFormat + '</td>';
        }
        // Column filling for scanned tables.
        for(j=0; j<scanTable.length; j++){
            if (costIO[i][0] === scanTable[j][0]){
                if (scanTable[j][1].indexOf('#')>=0){
                    tempTscan = '<td>' + scanTable[j][1] + '</td>';
                }else{
                    tempTscan = '<td class="text-danger">' + scanTable[j][1] + '</td>';
                }
            }
        }
        // Column filling for index scan.
        for(j=0; j<scanIndex.length; j++){
            if (costIO[i][0] === scanIndex[j][0]){
                tempFscan	= '<td class="text-monospace" id="interCell">'
                            + '<p class="text-white-50 headers"><strong class="font-weight-bold text-white">Tabla:  </strong>' + scanIndex[j][1] + '</p>'
                            + '<p class="text-white-50 headers"><strong class="font-weight-bold text-white">Indice: </strong>' + scanIndex[j][2] + '</p>'
                            + '<p class="text-white-50 headers"><strong class="font-weight-bold text-white">Llaves: </strong>' + scanIndex[j][3] + '</p></td>';
            }
        }
        colAssembly.push([tempLinea,tempIONum, tempTscan,tempFscan]);
    }

    for (i=0; i<colAssembly.length; i++){

        colHeaders += '<tr>';

        for (j=0; j<colAssembly[i].length; j++){
            if (colAssembly[i][j].indexOf('td')>=0){
                colHeaders += colAssembly[i][j];
            }else{
                colHeaders += '<td></td>';
            }
        }

        colHeaders += '</tr>'
    }
    document.getElementById('editor').value=ev.target.result;
    document.getElementById('costeTotal').innerHTML = ' <h2 class="text-center">' + '<b>Costo total estimado: </b><br><small>' + sumIO.toLocaleString('es-MX') + '</small></h2>';
    document.getElementById('tabla').innerHTML= colHeaders;
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