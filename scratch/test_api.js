const url = 'https://express-syria.glcpaints.com:7779/General/GeneralAPI/';
const spName = 'APIExprssControlOperation';

async function test() {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'SP_Name': spName
      },
      body: JSON.stringify({
        AppVersionWeb: '225',
        AppVersionAndroid: '225',
        AppVersionIos: '225',
        AppVersionDesktop: '225',
        FireBaseToken: '',
        PlatForm: 'web',
        deviceID: '',
        IP: '192.168.1.3',
        Operation: 'Get Express Details By Period',
        LineData: JSON.stringify({ Period: 'yearly', Months: '', Quarter: 0, Year: 2026 }),
        User: 'TestUser'
      })
    });
    const text = await res.text();
    console.log(text);
  } catch (e) {
    console.error(e);
  }
}

test();
