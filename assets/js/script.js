const protocols = ["vless", "trojan", "vmess"];

function isValidIp(ipaddress) {
    if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipaddress)) {
        return true
    }
    return false;
}

function uniqueArray(arr) {
    var a = [];
    for (var i=0, l=arr.length; i<l; i++)
        if (a.indexOf(arr[i]) === -1 && arr[i] !== '')
            a.push(arr[i]);
    return a;
}

function copyToClipboard(text, data) {
    navigator.clipboard.writeText(text).then(() => {
        $('#tableResults [data-ipt="'+data+'"] small').text('کپی شد');
        setTimeout(function() {
            $('#tableResults [data-ipt="'+data+'"] small').text('کپی کانفیگ');
        }, 2500)
    }).catch(() => {
        //
    });
}

function findIpInString(string) {
    try {
        let preg = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/;
        let result = string.match(preg);
        return (typeof result[0] !== "undefined" ? result[0] : "");
    }
    catch(err) {
        //location.reload();
    }
}

function findDefIp(pastedConfig) {
    if ( pastedConfig === '' ) {
        return false;
    }
    let config = pastedConfig.split("@");
    config = config[1].split(":");
    return config[0];
}

function updateConfig(ip) {
    let pastedConfig = $('#defConfig').val();
    let provider = $('#provider').val();
    if ( getProtocol(pastedConfig) === 'vmess' ) {
        let oldConf = base64Decode(pastedConfig);
        oldConf.add = ip;
        oldConf.ps = oldConf.ps+(provider !== "" ? "_"+provider.toUpperCase() : "");
        let newConf = base64Encode(oldConf);
        return 'vmess://'+newConf;
    }
    else {
        let findIp = findDefIp(pastedConfig);
        pastedConfig = pastedConfig.replace(findIp, ip);
        return pastedConfig+(provider !== "" ? "_"+provider.toUpperCase() : "");
    }
}

function base64Decode(config) {
    try {
        config = config.replace("vmess://", "");
        return JSON.parse(atob(config));
    }
    catch {
        return {};
    }
}

function base64Encode(object) {
    try {
        return btoa(JSON.stringify(object));
    }
    catch {
        return "";
    }
}

$(document).on('keyup', '#defConfig', function(e) {
    e.preventDefault();
    let config = $(this).val();
    localStorage.setItem("defConfig", config);
    let protocol = getProtocol(config);
    if ( ! protocols.includes(protocol) ) {
        $('#protocolAlert').removeClass('none');
        return false;
    }
    if ( countConfigs(config) > 1 ) {
        $('#configAlert').removeClass('none');
        return false;
    }
    $('#protocolAlert, #configAlert').addClass('none');
    $('#pastedList').trigger('keyup');

});

$(document).on('change', '#provider', function(e) {
    e.preventDefault();
    $('#pastedList').trigger('keyup');
});

$(document).on('keyup', '#pastedList', function(e) {
    e.preventDefault();
    let list = $(this).val();
    let html = '';
    let code = '';
    let validIp = 1;
    if ( $('#defConfig').val() === '' ) {
        return false;
    }
    if ( list !== '' ) {
        list = list.split("\n");
        if ( list.length > 0 ) {
            list = uniqueArray(list);
            for (let i=0; i<list.length; i++){
                let vl = list[i];
                vl = findIpInString(vl);
                try {
                    vl = vl.trim();
                }
                catch(err) {
                    //location.reload();
                }
                if (vl === "") { continue; }
                if (typeof vl === "null") { continue; }
                if (!isValidIp(vl)) { continue; }
                let newConf = updateConfig(vl);
                code += newConf+"\n";
                html += '<tr>';
                html += '<td>';
                html += translateDigits(validIp);
                html += '</td>';
                html += "<td onclick='copyToClipboard(\""+vl+"\", \"\");'>";
                html += vl;
                html += '</td>';
                html += '<td>';
                html += "<a href='javascript:;' onclick='dnsTest(\""+vl+"\", \"\");' class='label label-info'><small>پینگ</small></a> ";
                html += " <a href='https://quickchart.io/qr?size=300x200&light=ffffff&text="+encodeURIComponent(newConf)+"' class='label label-primary' target='_blank'><small>کد QR</small></a> ";
                html += " <a href='javascript:;' onclick='copyToClipboard(\""+newConf+"\", \""+vl+"\");' class='label label-success' data-ipt='"+vl+"'><small>کپی کانفیگ</small></a> ";
                html += '</td>';
                html += '</tr>';
                if ( validIp < 2 ) {
                    $('#tableResults').removeClass('hidden');
                }
                validIp++;
            }
            $('#result').html(html);
            $('#list').html(code.slice(0, -1));
        }
    }
    else {
        $('#tableResults').addClass('hidden');
        validIp = 0;
    }
});

function getProtocol(config) {
    let string = config.split("://");
    if ( typeof string[0] !== 'undefined' ) {
        return string[0];
    }
    return '';
}

$(document).on('click', '#fetchFromOther', function(e) {
    e.preventDefault();
    $('#pastedList').val('').trigger('keyup');
    let provider = $('#provider').val();
    if ( provider === '' || typeof provider === 'undefined' ) {
        $('#provider').focus();
        return;
    }
    let inArr = [ provider ];
    if ( provider === 'irc' || provider === 'mtn' ) {
        inArr = [ "irc", "mtn" ];
    }
    if ( provider === 'mkb' || provider === 'mkh' ) {
        inArr = [ "mkb", "mkh" ];
    }
    document.getElementById('fetchFromOther').disabled = true;
    jQuery.get('https://raw.githubusercontent.com/vfarid/cf-clean-ips/main/list.json?v1.'+Date.now(), function(data) {
        data = JSON.parse(data);
        $i = 0;
        let ipList = "";
        jQuery.each(data['ipv4'], function(index, item) {
            if ( inArr.includes(item.operator.toLowerCase()) ) {
                if ( $i !== 0 ) {
                    ipList += "\n";
                }
                ipList += item.ip;
                $i++;
            }
        });
        $('#pastedList').val(ipList).trigger('keyup');
        document.getElementById('fetchFromOther').disabled = false;
    }).fail(function() {
        $('#pastedList').val('').trigger('keyup');
        document.getElementById('fetchFromOther').disabled = false;
    });
});

async function dnsTest(ip) {
    const timeout = 2500;
    const url = `https://${ip}/__down`;
    const startTime = performance.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        controller.abort();
    }, timeout);
    try {
        const response = await fetch(url, {
            signal: controller.signal,
        });
    } catch (error) {
        if (error.name === "AbortError") {
            testResult = false;
        }
        else {
            testResult = true;
        }
    }
    clearTimeout(timeoutId);
    const duration = performance.now() - startTime;
    if ( testResult ) {
        alert('پینگ آی‌پی '+ip+' بر روی اینترنت شما '+translateDigits(numberWithCommas(Math.floor(duration / 5)))+' میلی‌ثانیه بوده است.');
    }
    else {
        alert("آی‌پی "+ip+" بر روی اینترنت شما پینگ ندارد!\nاگر سرویس‌دهنده مدنظر با اینترنت شما یکسان بوده و فیلترشکنتان خاموش است، باید از آن صرف‌نظر کنید.");
    }
}

function strReplace(search, replace, subject, count) {
    let i = 0,
        j = 0,
        temp = '',
        repl = '',
        sl = 0,
        fl = 0,
        f = [].concat(search),
        r = [].concat(replace),
        s = subject,
        ra = Object.prototype.toString.call(r) === '[object Array]',
        sa = Object.prototype.toString.call(s) === '[object Array]';
    s = [].concat(s);
    if (count) {
        this.window[count] = 0;
    }
    for (i = 0, sl = s.length; i < sl; i++) {
        if (s[i] === '') {
            continue;
        }
        for (j = 0, fl = f.length; j < fl; j++) {
            temp = s[i] + '';
            repl = ra ? (r[j] !== undefined ? r[j] : '') : r[0];
            s[i] = (temp)
                .split(f[j])
                .join(repl);
            if (count && s[i] !== temp) {
                this.window[count] += (temp.length - s[i].length) / f[j].length;
            }
        }
    }
    return sa ? s : s[0];
}

function translateDigits(string, to) {
    if (typeof(to) === 'undefined') to = 'fa';
    let persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    let englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    if (to === 'en') {
        return strReplace(persianDigits, englishDigits, string);
    }
    return strReplace(englishDigits, persianDigits, string);
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function countConfigs(str) {
    const strWithoutSpace = str.toLowerCase().replace(/\s/g, "");
    let totalConfig = 0;
    for (let i = 0; i < strWithoutSpace.length; i++) {
        const char = strWithoutSpace[i];
        if (char === "v" && strWithoutSpace.slice(i, i + 8) === "vless://") {
            totalConfig++;
            i += 4;
        }
        else if (char === "v" && strWithoutSpace.slice(i, i + 8) === "vmess://") {
            totalConfig++;
            i += 4;
        }
        else if (char === "t" && strWithoutSpace.slice(i, i + 9) === "trojan://") {
            totalConfig++;
            i += 4;
        }
    }
    return totalConfig;
}
