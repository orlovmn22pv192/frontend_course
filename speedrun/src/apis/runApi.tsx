import axios, { AxiosRequestConfig } from 'axios';
import Axios, {AxiosError, AxiosResponse} from 'axios';
import { AuthContext } from '../components/AuthContext';
import { MyFormValues } from '../components/CreateRun';
import { baseURL } from '../constants';
import RunData from '../models/RunData';
import { NavigateFunction } from 'react-router-dom';


const runPath = baseURL + '/speedrun/runs/'

export async function getRunsShort(resultHandler: (data: any)=>void, id:number=1){
    Axios.get(runPath,
        { params:{game_id:id}, responseType: "json" }
    ).then
    (result => {
        const data: RunData[] = (result as AxiosResponse<RunData[]>).data;
        resultHandler(data);
    })
    .catch((error: AxiosError) => {
        alert(error.message);
    });
}

function parseJwt (token: any) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

export async function postRun(resultHandler:(run: RunData)=>void, data:MyFormValues, game_id:number, 
                                            auth_context:AuthContext | null, navigate:NavigateFunction){
    const now = new Date();
    const run = {
        data: now.toISOString().slice(0,10),
        hours: data.hour,
        minutes: data.minutes,
        seconds: data.seconds,
        video: data.link,
        userName: parseJwt(localStorage.getItem('access')).name,
        game: game_id
    }

    const api = axios.create({baseURL: baseURL})
    api.interceptors.request.use((config: AxiosRequestConfig) => {
        config.headers = {'Authorization': 'Bearer ' + localStorage.getItem('access')};
        return config;
    })
    api.interceptors.response.use((config) =>{
        return config;
    }, async (error) =>{
        if(error.response.status === 401 && error.config && !error.config._isRetry){
            try {
                const response = await axios.post(
                    `${baseURL}/auth/token/refresh/`,
                    {refresh:localStorage.getItem('refresh')}
                )
                localStorage.setItem('access', response?.data.access)
                error.config.headers = {
                    'Content-Type': 'application/json',
                }
                error.config.data = JSON.parse(error.config.data);
                return api.request(error.config);
            }catch (e){
                console.log(e);
                auth_context?.setAuth(false);
                localStorage.clear();
                navigate('/login')
            }
        }
    })
    api.post<RunData>(
        '/speedrun/runs/', 
        run, 
        {
            headers: {
                'Content-Type': 'application/json'
            },
        }  
    ).then
    (result => {
        const data: RunData = (result as AxiosResponse<RunData>).data;
        resultHandler(data);
    })
    .catch((error: AxiosError) => {
        console.log(error.message);
    });
}