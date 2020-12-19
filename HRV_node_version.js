var fs = require('fs');

var cutoff_threshold =  0.5;
var sample_frequency = 51.6;
var gap_threshold = 0.2;

function StandardDeviation (array) {
    const n = array.length;
    const mean = array.reduce((a, b) => a + b) / n;
    return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n);
  }

function bernstein(A,B,C,D,E,t){
    s=1-t;
    x = (A * s*s*s*s) + (B*4*s*s*s*t) + (C*6*s*s*t*t)
    + (D*4*s*t*t*t) + (E*t*t*t*t);
    return x;
}

function upscale(values){
    var new_array =[];
    for(let i = 0; i < values.length-5; i+=5){
            p0 = values[i];
            p1 = values[i+1];
            p2 = values[i+2];
            p3 = values[i+3];
            p4 = values[i+4];
        for(let T = 0; T < 100; T += 10) {
            x = T/100;
            D = bernstein(p0,p1,p2,p3,p4,x);
            new_array.push(D);
        }
    }
    return new_array;
}

function average(scores){
    var sum = 0;
    for(var i = 0; i < scores.length; i++){
        sum += parseFloat(scores[i]);
    }
    var avg = sum/scores.length;
    return avg;
}

function rolling_average(original_array, count){
    temp_array = [];
    var new_array = [];
    for(let i = 0; i < original_array.length-count; i ++){
        temp_array = [];
        for(let x = 0;x < count; x ++)
            temp_array.push(original_array[i+x]);
        new_array.push(average(temp_array));
    }
    return new_array;
}

function apply_cutoff(original_array){
    var x;
    var new_array = [];
    for(let i = 0; i < original_array.length; i ++){
        x = original_array[i];
        if(x<cutoff_threshold)
            x=cutoff_threshold;
        new_array.push(x);
    }
    return new_array;
}

function find_peaks(original_array){
    var extremes = [];
    var previous;
    var previous_slope = 0;
    var slope;

    for(let i = 0; i<original_array.length;i++){
        if(previous == null)
            previous = original_array[i];
        slope = original_array[i] - previous;
        if(slope * previous_slope < 0)
            extremes.push(previous);
        else
            extremes.push(0);
        previous_slope = slope;
        previous = original_array[i];
    }
    return extremes;
}

function calculate_gaps(original_array){
    var gap_size = 0;
    var gap_array = [];
    for(let i = 0; i<original_array.length;i++){
        if(original_array[i]>0){
            if(gap_size >20)
            gap_array.push(gap_size);
            gap_size = 0;
        }
        else{
            gap_size++;
        }
    }
    return gap_array;
}

function calculate_HRV(original_array){
    var gap_average = average(original_array);
    var temp_array = [];
    var gap_max = (1 + gap_threshold) * gap_average;
    var gap_min = (1 - gap_threshold) * gap_average;
    for(let i = 0; i<original_array.length;i++){
        if(original_array[i]>gap_min && original_array[i]<gap_max)
            temp_array.push(original_array[i]);
    }
     var HRV = (StandardDeviation(temp_array) * (1/(sample_frequency*2) * 1000)).toFixed(0);
     console.log("HRV: " + HRV);
}

//read file into string
fs.readFile('HRV.csv', 'utf8', function(err, data) {
    if (err) throw err;
    //console.log(data);
    var values = data.split(/\r?\n/);

    console.log("array size = " + values.length);

    var rolling_array = rolling_average(values, 5);

    var upscale_array = upscale(rolling_array);

    upscale_array = rolling_average(upscale_array,5);

    var cut_off_filter = apply_cutoff(upscale_array);

    var peaks = find_peaks(cut_off_filter);

    var gap_analysis = calculate_gaps(peaks);

    calculate_HRV(gap_analysis);

    var csvContent = upscale_array.join("\n");
    fs.writeFile('bezier.csv', csvContent, function (err) {
        if (err) throw err;
        console.log('Saved!');
    });

    csvContent = rolling_array.join("\n");
    fs.writeFile('rolling_average.csv', csvContent, function (err) {
        if (err) throw err;
        console.log('Saved!');
    });

    csvContent = cut_off_filter.join("\n");
    fs.writeFile('cuttoff.csv', csvContent, function (err) {
        if (err) throw err;
        console.log('Saved!');
    });

    csvContent = peaks.join("\n");
    fs.writeFile('peaks.csv', csvContent, function (err) {
        if (err) throw err;
        console.log('Saved!');
    });

    csvContent = gap_analysis.join("\n");
    fs.writeFile('gaps.csv', csvContent, function (err) {
        if (err) throw err;
        console.log('Saved!');
    });

});