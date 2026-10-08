import axios from "axios";

const api = axios.create({
  baseURL: "https://task-scheduler-ai60.onrender.com/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT automatically to authenticated requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Create a task
export const createTask = async (taskData) => {
  const response = await api.post("/tasks", taskData);
  return response.data;
};

// Get all tasks
export const getTasks = async () => {
  const response = await api.get("/tasks");
  return response.data;
};

// Update a task
export const updateTask = async (id, taskData) => {
  const response = await api.put(`/tasks/${id}`, taskData);
  return response.data;
};

// Delete a task
export const deleteTask = async (id) => {
  const response = await api.delete(`/tasks/${id}`);
  return response.data;
};

// Schedule a task
export const scheduleTask = async (id, scheduleData) => {
  const response = await api.post(
    `/tasks/${id}/schedule`,
    scheduleData
  );
  return response.data;
};

// Get schedule preview
export const getSchedulePreview = async (params = {}) => {
  const response = await api.get("/tasks/preview", { params });
  return response.data;
};

export default api;