/* @refresh reload */
import { render } from 'solid-js/web'
import './index.css'
import App from './App.jsx'
import { Toaster } from "solid-toast";

const root = document.getElementById('root')

render(
  () => (
    <>
      <App />
      <Toaster
        position="bottom-right"
        gutter={8}
        toastOptions={{
          duration: 4000,
          className: "my-toast text-sm bg-primary text-white",
        }}
      />
    </>
  ),
  root
);
