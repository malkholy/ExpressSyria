const IS_DEV = import.meta.env.DEV;
const API_URL = IS_DEV
  ? '/api/General/GeneralAPI/'
  : 'https://express-syria.glcpaints.com:7779/General/GeneralAPI/';

const BASE_BODY = {
  AppVersionWeb: '225',
  AppVersionAndroid: '225',
  AppVersionIos: '225',
  AppVersionDesktop: '225',
  FireBaseToken: '',
  PlatForm: 'web',
  deviceID: '',
  IP: '192.168.1.3'
};

export async function apiCall(operation, lineData = null, extraParams = {}, apiType = 'default') {
  const target = (apiType === true || apiType === 'express') ? 'express' : (apiType === 'hr' ? 'hr' : (apiType === 'plus' ? 'plus' : 'default'));

  let url = '';
  let spName = '';

  if (target === 'express') {
    url = IS_DEV ? '/express-api/General/GeneralAPI/' : 'https://express-syria.glcpaints.com:7779/General/GeneralAPI/';
    spName = 'APIExprssControlOperation';
  } else if (target === 'hr') {
    url = IS_DEV ? '/hr-api/General/GeneralAPI/' : 'https://express-syria.glcpaints.com:7779/General/GeneralAPI/';
    spName = 'APIHRControlOperation';
  } else if (target === 'plus') {
    url = IS_DEV ? '/plus-api/General/GeneralAPI/' : 'https://express-syria.glcpaints.com:7779/General/GeneralAPI/';
    spName = 'APIPlusOperation';
  } else {
    url = IS_DEV ? '/api/General/GeneralAPI/' : 'https://express-syria.glcpaints.com:7779/General/GeneralAPI/';
    spName = 'APIPanelOperation';
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'SP_Name': spName
    },
    body: JSON.stringify({
      ...BASE_BODY,
      Operation: operation,
      LineData: lineData ? JSON.stringify(lineData) : null,
      User: sessionStorage.getItem('FullName') || '',
      ...extraParams
    })
  });
  const text = await res.text();
  console.log(operation, 'raw:', text);
  if (!text) throw new Error('Empty response from server');
  return JSON.parse(text);
}



