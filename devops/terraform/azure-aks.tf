# Microsoft Azure Infrastructure Provisioner

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "rg" {
  name     = "leatrace-prod-rg"
  location = "Central India"
}

# 1. Virtual Network
resource "azurerm_virtual_network" "vnet" {
  name                = "leatrace-azure-vnet"
  address_space       = ["10.2.0.0/16"]
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
}

resource "azurerm_subnet" "subnet" {
  name                 = "leatrace-azure-subnet"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.2.1.0/24"]
}

# 2. Azure Kubernetes Service (AKS)
resource "azurerm_kubernetes_cluster" "aks" {
  name                = "leatrace-aks-cluster"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  dns_prefix          = "leatracek8s"

  default_node_pool {
    name       = "default"
    node_count = 3
    vm_size    = "Standard_D4_v5"
  }

  identity {
    type = "SystemAssigned"
  }
}

# 3. Azure Database for PostgreSQL
resource "azurerm_postgresql_flexible_server" "postgres" {
  name                   = "leatrace-azure-postgres"
  resource_group_name    = azurerm_resource_group.rg.name
  location               = azurerm_resource_group.rg.location
  version                = "15"
  administrator_login    = "leatrace_admin"
  administrator_password = "SecureDbPass@2026"
  sku_name               = "GP_Standard_D2ds_v5"
}

# 4. Azure Storage Account (Evidence Vault)
resource "azurerm_storage_account" "storage" {
  name                     = "leatraceazurevault"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}
