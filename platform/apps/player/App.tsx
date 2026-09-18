import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "@react-router/vercel";
import axios from "axios";
import { io } from "socket.io-client";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30000,
    },
  },
});

const socket = io("http://localhost:4000", {
  transports: ["websocket"],
});

const router = createBrowserRouter();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export const config = {
  runtime: "nodejs20.x",
};