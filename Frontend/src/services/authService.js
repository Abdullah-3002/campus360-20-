import axios from 'axios';

const BASE_URL = 'http://localhost:8000/api';

export const loginUser = async (email, password) => {
    const response = await axios.post(`${BASE_URL}/auth/login/`, {
        email: email,
        password: password
    });
    return response.data;
};

export const registerUser = async (username, email, password, confirmPassword) => {
    const response = await axios.post(`${BASE_URL}/auth/register/`, {
        username: username,
        email: email,
        password: password,
        confirm_password: confirmPassword,
        user_type: 'student'
    });
    return response.data;
};

export const getCurrentUser = async (token) => {
    const response = await axios.get(`${BASE_URL}/auth/me/`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return response.data;
};