import React from "react";
import { Link } from "react-router-dom";

const Nav = () => {
  return (
    <nav className="navbar navbar-dark sticky-top bg-dark flex-md-nowrap p-0 shadow">
      <div className="container d-flex justify-content-between align-items-center">
        {/* Company Name Button */}
        <button
          className="navbar-brand col-md-3 col-lg-2 mr-0 px-3 btn btn-link text-white"
          style={{ textDecoration: "none" }}
        >
          Company Name
        </button>

        {/* Navbar Toggler for mobile */}
        <button
          className="navbar-toggler position-absolute d-md-none collapsed"
          type="button"
          data-toggle="collapse"
          data-target="#sidebarMenu"
          aria-controls="sidebarMenu"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Navbar Links for Desktop */}
        <ul className="navbar-nav d-flex flex-row ms-auto">
          <li className="nav-item mx-2">
            <Link
              to="/"
              className="nav-link text-white btn btn-outline-light rounded-pill px-3 py-2"
              style={{ textDecoration: "none" }}
            >
              Timeline
            </Link>
          </li>
          <li className="nav-item mx-2">
            <Link
              to="/admin/products"
              className="nav-link text-white btn btn-outline-light rounded-pill px-3 py-2"
              style={{ textDecoration: "none" }}
            >
              Products
            </Link>
          </li>
        </ul>

        {/* Search Input */}
        <input
          className="form-control form-control-dark w-100 rounded-pill"
          type="text"
          placeholder="Search"
          aria-label="Search"
          style={{ maxWidth: "300px", marginLeft: "auto" }}
        />
      </div>
    </nav>
  );
};

export default Nav;
