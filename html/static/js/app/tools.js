export function prettyDate2(t){
  //return new Date(UNIX_timestamp * 1000).toISOString().slice(0, 19).replace('T', ' ');
  return t.toISOString().slice(0, 19).replace('T', ' ');
}

export function prettyDate(a){
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var year = a.getFullYear();
  var month = months[a.getMonth()];
  var date = a.getDate();
  var hour = a.getHours();
  var min = a.getMinutes() < 10 ? '0' + a.getMinutes() : a.getMinutes();
  var sec = a.getSeconds() < 10 ? '0' + a.getSeconds() : a.getSeconds();
  var time = month + ' ' + date + ', ' + year + ' ' + hour + ':' + min + ':' + sec ;
  return time;
}

export function addDecimal(num, move, fixed=18){
    return parseFloat(Number((parseInt(num) / 10**move).toFixed(fixed))).toFixed(fixed).replace(/\.?0+$/,"");

}

export function removeDecimal(num, places){
    return Number((num / 100).toFixed(2));

}