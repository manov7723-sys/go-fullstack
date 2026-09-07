import React, { createContext, useContext, useReducer, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../services/api";
import { User, LoginRequest, RegisterRequest } from "../types";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: "AUTH_START" }
  | { type: "AUTH_SUCCESS"; payload: { user: User; token: string } }
  | { type: "AUTH_FAILURE"; payload: string }
  | { type: "AUTH_LOGOUT" }
  | { type: "CLEAR_ERROR" };

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem("token"),
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case "AUTH_START":
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case "AUTH_SUCCESS":
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case "AUTH_FAILURE":
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case "AUTH_LOGOUT":
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case "CLEAR_ERROR":
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const navigate = useNavigate();

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          dispatch({ type: "AUTH_START" });
          const user = await authApi.getCurrentUser();
          dispatch({ type: "AUTH_SUCCESS", payload: { user, token } });
        } catch (error) {
          localStorage.removeItem("token");
          dispatch({ type: "AUTH_FAILURE", payload: "Session expired" });
        }
      } else {
        dispatch({ type: "AUTH_FAILURE", payload: "" });
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      dispatch({ type: "AUTH_START" });
      const { user, accessToken } = await authApi.login(credentials);
      localStorage.setItem("token", accessToken);
      dispatch({ type: "AUTH_SUCCESS", payload: { user, token: accessToken } });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Login failed";
      dispatch({ type: "AUTH_FAILURE", payload: errorMessage });
      throw error;
    }
  };

  const register = async (userData: RegisterRequest) => {
    try {
      dispatch({ type: "AUTH_START" });
      const { user, accessToken } = await authApi.register(userData);
      localStorage.setItem("token", accessToken);
      dispatch({ type: "AUTH_SUCCESS", payload: { user, token: accessToken } });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Registration failed";
      dispatch({ type: "AUTH_FAILURE", payload: errorMessage });
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    dispatch({ type: "AUTH_LOGOUT" });
    navigate("/login");
  };

  const clearError = () => {
    dispatch({ type: "CLEAR_ERROR" });
  };

  const updateUser = (user: User) => {
    if (state.user) {
      dispatch({
        type: "AUTH_SUCCESS",
        payload: { user, token: state.token! },
      });
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    clearError,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
