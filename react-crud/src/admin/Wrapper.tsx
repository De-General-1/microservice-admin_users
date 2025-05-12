import React, { PropsWithChildren } from "react";
import Nav from "./components/Nav";
import Sidebar from "./components/Sidebar";

const Wrapper = (props: PropsWithChildren<any>) => {
  return (
    <div>
      <Nav />

      <div className="container-fluid">
        <div className="row w-full" style={{ minHeight: "100vh" }}>
          <main
            role="main"
            className="col-md-12 ms-sm-auto col-lg-10 px-md-4 py-4 bg-light"
          >
            {props.children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Wrapper;
