import React from "react";
import { Link, useLocation } from "react-router-dom";

const Sidebar = () => {
  const location = useLocation();

  return (
    <div
      id="sidebarMenu"
      className="col-md-3 col-lg-2 d-md-block bg-light sidebar"
      style={{
        paddingTop: "56px", // Offset for fixed navbar
        borderRight: "1px solid #ddd", // Optional: Adds a border to the right of the sidebar
      }}
    >
      <div className="pt-3">
        <ul className="nav flex-column">
          <li className="nav-item">
            <Link
              to="/admin/products"
              className={`nav-link ${
                location.pathname === "/admin/products" ? "active" : ""
              }`}
            >
              Products
            </Link>
          </li>
          <li className="nav-item">
            <Link
              to="/admin/products/create"
              className={`nav-link ${
                location.pathname === "/admin/products/create" ? "active" : ""
              }`}
            >
              Create Product
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
