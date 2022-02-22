export default function (login: string, size: number) {
  let url = `https://avatars.githubusercontent.com/${login}`;
  if (size) { 
    url += `?s=${size}`; 
  }

  return url;
}
