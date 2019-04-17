window.addEventListener('load', inicio, false);

var filename = '';

function inicio() {
    document.getElementById('showPlan').addEventListener('change', cargar, false);
    document.getElementById('table_dis').style.display = 'none';
    document.getElementById('editor').style.display = 'none';
}

function cargar(ev) {
    filename = ev.target.files[0].name;
    document.getElementById('datosArchivo').innerHTML	='Nombre del archivo: '+filename+'<br>'
        +'Tamaño del archivo: '+ev.target.files[0].size+' bytes';

    var arch = new FileReader();
    arch.addEventListener('load',leer,false);
    arch.readAsText(ev.target.files[0]);

    document.getElementById('info_dis').style.display = 'none';
    document.getElementById('table_dis').style.display = 'block';
    document.getElementById('editor').style.display = 'block';
}

function leer(ev) {
    var array =  ev.target.result.split("): ");
    var arrayScan =  ev.target.result.split("QUERY PLAN FOR STATEMENT ");
    var arrayIos = ev.target.result.split("Total estimated I/O cost for");
    var i;
    var j;
    var k;
    var l = 0;
    var suma = 0;
    var scan = [];		// [Línea][Tabla]
    var fscan = [];		// [Línea][Tabla][Indices]
    var ios = [];		// [Línea][I/O]
    var resulset = [];	// [Línea][I/O][Tabla Full scan][Tabla con indice][Indices]
    var table = '<tr><th>Línea dentro del SP </th><th>Coste de I/O Estimado </th><th>Tablas Escaneadas</th><th>Escaneos con indices</th></tr>';

    for(i=0; i<array.length; i++){
        suma+=isNaN(parseInt(array[i]))?0:parseInt(array[i]);
    }
    //Identificación de la cantidad de I/O
    for(k=1; k<arrayIos.length; k++){
        var aplica = arrayIos[k].substring(arrayIos[k].indexOf('):'),arrayIos[k].indexOf('.')).replace('): ','')
        if (parseInt(aplica)>0){
            var tempLine = arrayIos[k].substring(arrayIos[k].indexOf('at line'),arrayIos[k].indexOf('):')).replace('at line ','');
            var tempIO = arrayIos[k].substring(arrayIos[k].indexOf('):'),arrayIos[k].indexOf('.')).replace('): ','');
            ios.push([tempLine,tempIO]);
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
                    scan.push([linea, tempScan]);
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

                        fscan.push([lineaFW,tempTab,tempInd,tempKey]);
                    }
                    else{
                        var tempTab = arrayFW[k].substring(l,arrayFW[k].indexOf('Index')).replace(/\|/g,'');
                        var tempInd = arrayFW[k].substring(arrayFW[k].indexOf('Index :'),arrayFW[k].indexOf('Forward Scan.')).replace('Index : ','').replace(/\|/g,'');//index
                        if(arrayFW[k].indexOf('Keys are:')>=0){
                            var tempKey = arrayFW[k].substring(arrayFW[k].indexOf('Keys are:'),arrayFW[k].indexOf('Using I/O')).replace('Keys are:','').replace(/\|/g,'');//Llaves
                        }else{
                            var tempKey = 'N/A';
                        }
                        fscan.push([lineaFW,tempTab,tempInd,tempKey]);
                    }
                }
            }
        }
    }
    if(scan===''){
        scan = 'No scan';
    }
// [Línea][I/O][Tabla Full scan][Tabla con indice][Indices]
    for(i=0; i<ios.length; i++){
        var tempTscan = '';
        var tempFscan = '';
        var tempLinea = '<td id="linea">' + ios[i][0] + '</td>';
        var tempIOcos = parseInt(ios[i][1],10);
        var tempIOcosFormat;
        var tempIONum;

        if (tempIOcos >= 1000000){
            tempIOcosFormat = tempIOcos.toLocaleString('es-MX');
            tempIONum= '<td id="ioMay">' + tempIOcosFormat + '</td>';
        }else if (tempIOcos >= 500000 && tempIOcos < 1000000){
            tempIOcosFormat = tempIOcos.toLocaleString('es-MX');
            tempIONum = '<td id="ioMen">' + tempIOcosFormat + '</td>';
        }else {
            tempIOcosFormat = tempIOcos.toLocaleString('es-MX');
            tempIONum = '<td id="ioNor">' + tempIOcosFormat + '</td>';
        }

        for(j=0; j<scan.length; j++){
            if (ios[i][0] === scan[j][0]){
                if (scan[j][1].indexOf('#')>=0){
                    tempTscan = '<td>' + scan[j][1] + '</td>';
                }else{
                    tempTscan = '<td id="tabScan">' + scan[j][1] + '</td>';
                }
            }
        }
        for(j=0; j<fscan.length; j++){
            if (ios[i][0] === fscan[j][0]){
                tempFscan	= '<td id="interCell">Tabla' + fscan[j][1]
                    + '<br>Indice: ' + fscan[j][2]
                    + '<br>Llaves: ' + fscan[j][3] + '</td>';
            }
        }
        resulset.push([tempLinea,tempIONum, tempTscan,tempFscan]);
    }

    for (i=0; i<resulset.length; i++){

        table += '<tr>';

        for (j=0; j<resulset[i].length; j++){
            if (resulset[i][j].indexOf('td')>=0){
                table += resulset[i][j];
            }else{
                table += '<td></td>';
            }
        }

        table += '</tr>'
    }
    document.getElementById('editor').value=ev.target.result;
    document.getElementById('costeTotal').innerHTML='<h1>' + '<b>Total estimated I/O cost: </b>' + suma.toLocaleString('es-MX') + '</h1>';
    document.getElementById('tabla').innerHTML= table;
}

function downloadCSV(csv, filename) {
    var csvFile;
    var downloadLink;

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
    var csv = [];
    var salida = 'I/O_Cost_'+filename;
    var rows = document.querySelectorAll("table tr");

    for (var i = 0; i < rows.length; i++) {
        var row = [], cols = rows[i].querySelectorAll("td, th");

        for (var j = 0; j < cols.length; j++)
            row.push('"'+cols[j].innerText+'"');

        csv.push(row.join(","));
    }

    // Download CSV file
    downloadCSV(csv.join("\n"), salida);
}