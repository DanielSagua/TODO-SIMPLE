/*
  TODO SIMPLE (Multiusuario) - SQL Server Schema
*/

USE [TodoSimpleDB];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.UserRoles', 'U') IS NOT NULL DROP TABLE dbo.UserRoles;
IF OBJECT_ID('dbo.Roles', 'U') IS NOT NULL DROP TABLE dbo.Roles;
IF OBJECT_ID('dbo.Tasks', 'U') IS NOT NULL DROP TABLE dbo.Tasks;
IF OBJECT_ID('dbo.TaskStatuses', 'U') IS NOT NULL DROP TABLE dbo.TaskStatuses;
IF OBJECT_ID('dbo.Priorities', 'U') IS NOT NULL DROP TABLE dbo.Priorities;
IF OBJECT_ID('dbo.ProjectMembers', 'U') IS NOT NULL DROP TABLE dbo.ProjectMembers;
IF OBJECT_ID('dbo.Projects', 'U') IS NOT NULL DROP TABLE dbo.Projects;
IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL DROP TABLE dbo.Users;
GO

CREATE TABLE dbo.Users (
  id_user INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  nombre NVARCHAR(150) NOT NULL,
  correo NVARCHAR(150) NOT NULL,
  password_hash NVARCHAR(255) NOT NULL,
  activo BIT NOT NULL CONSTRAINT DF_Users_activo DEFAULT(1),
  failed_attempts INT NOT NULL CONSTRAINT DF_Users_failed DEFAULT(0),
  locked_until_utc DATETIMEOFFSET NULL,
  created_at_utc DATETIMEOFFSET NOT NULL CONSTRAINT DF_Users_created DEFAULT SYSUTCDATETIME(),
  updated_at_utc DATETIMEOFFSET NULL
);
GO
CREATE UNIQUE INDEX UX_Users_correo ON dbo.Users(correo);
GO

CREATE TABLE dbo.Roles (
  id_role INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  nombre NVARCHAR(50) NOT NULL
);
GO
CREATE UNIQUE INDEX UX_Roles_nombre ON dbo.Roles(nombre);
GO

CREATE TABLE dbo.UserRoles (
  id_user INT NOT NULL,
  id_role INT NOT NULL,
  CONSTRAINT PK_UserRoles PRIMARY KEY (id_user, id_role),
  CONSTRAINT FK_UserRoles_Users FOREIGN KEY (id_user) REFERENCES dbo.Users(id_user),
  CONSTRAINT FK_UserRoles_Roles FOREIGN KEY (id_role) REFERENCES dbo.Roles(id_role)
);
GO

CREATE TABLE dbo.Projects (
  id_project INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  nombre NVARCHAR(150) NOT NULL,
  descripcion NVARCHAR(400) NULL,
  owner_user_id INT NOT NULL,
  activo BIT NOT NULL CONSTRAINT DF_Projects_activo DEFAULT(1),
  created_at_utc DATETIMEOFFSET NOT NULL CONSTRAINT DF_Projects_created DEFAULT SYSUTCDATETIME(),
  updated_at_utc DATETIMEOFFSET NULL,
  CONSTRAINT FK_Projects_Owner FOREIGN KEY (owner_user_id) REFERENCES dbo.Users(id_user)
);
GO
CREATE INDEX IX_Projects_owner ON dbo.Projects(owner_user_id);
GO

CREATE TABLE dbo.ProjectMembers (
  id_project INT NOT NULL,
  id_user INT NOT NULL,
  member_role NVARCHAR(30) NOT NULL CONSTRAINT DF_ProjectMembers_role DEFAULT('Member'),
  created_at_utc DATETIMEOFFSET NOT NULL CONSTRAINT DF_ProjectMembers_created DEFAULT SYSUTCDATETIME(),
  CONSTRAINT PK_ProjectMembers PRIMARY KEY (id_project, id_user),
  CONSTRAINT FK_ProjectMembers_Projects FOREIGN KEY (id_project) REFERENCES dbo.Projects(id_project),
  CONSTRAINT FK_ProjectMembers_Users FOREIGN KEY (id_user) REFERENCES dbo.Users(id_user)
);
GO
CREATE INDEX IX_ProjectMembers_user ON dbo.ProjectMembers(id_user);
GO

CREATE TABLE dbo.TaskStatuses (
  id_status INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  nombre NVARCHAR(50) NOT NULL,
  sort_order INT NOT NULL,
  is_default BIT NOT NULL CONSTRAINT DF_TaskStatuses_default DEFAULT(0),
  is_final BIT NOT NULL CONSTRAINT DF_TaskStatuses_final DEFAULT(0)
);
GO
CREATE UNIQUE INDEX UX_TaskStatuses_nombre ON dbo.TaskStatuses(nombre);
GO

CREATE TABLE dbo.Priorities (
  id_priority INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  nombre NVARCHAR(50) NOT NULL,
  sort_order INT NOT NULL,
  is_default BIT NOT NULL CONSTRAINT DF_Priorities_default DEFAULT(0)
);
GO
CREATE UNIQUE INDEX UX_Priorities_nombre ON dbo.Priorities(nombre);
GO

CREATE TABLE dbo.Tasks (
  id_task INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  id_project INT NOT NULL,
  title NVARCHAR(200) NOT NULL,
  description NVARCHAR(MAX) NULL,
  id_status INT NOT NULL,
  id_priority INT NOT NULL,
  due_at_utc DATETIMEOFFSET NULL,
  assigned_user_id INT NULL,
  created_by_user_id INT NOT NULL,
  created_at_utc DATETIMEOFFSET NOT NULL CONSTRAINT DF_Tasks_created DEFAULT SYSUTCDATETIME(),
  updated_at_utc DATETIMEOFFSET NULL,
  completed_at_utc DATETIMEOFFSET NULL,
  is_deleted BIT NOT NULL CONSTRAINT DF_Tasks_deleted DEFAULT(0),
  CONSTRAINT FK_Tasks_Project FOREIGN KEY (id_project) REFERENCES dbo.Projects(id_project),
  CONSTRAINT FK_Tasks_Status FOREIGN KEY (id_status) REFERENCES dbo.TaskStatuses(id_status),
  CONSTRAINT FK_Tasks_Priority FOREIGN KEY (id_priority) REFERENCES dbo.Priorities(id_priority),
  CONSTRAINT FK_Tasks_Assigned FOREIGN KEY (assigned_user_id) REFERENCES dbo.Users(id_user),
  CONSTRAINT FK_Tasks_CreatedBy FOREIGN KEY (created_by_user_id) REFERENCES dbo.Users(id_user)
);
GO
CREATE INDEX IX_Tasks_project ON dbo.Tasks(id_project, is_deleted, id_status);
CREATE INDEX IX_Tasks_assigned ON dbo.Tasks(assigned_user_id, is_deleted, id_status);
CREATE INDEX IX_Tasks_due ON dbo.Tasks(due_at_utc);
GO

-- Seeds
INSERT INTO dbo.Roles(nombre) VALUES ('Admin'), ('User');

INSERT INTO dbo.TaskStatuses(nombre, sort_order, is_default, is_final)
VALUES
('Pendiente', 1, 1, 0),
('En curso', 2, 0, 0),
('En espera', 3, 0, 0),
('Hecha', 4, 0, 1);

INSERT INTO dbo.Priorities(nombre, sort_order, is_default)
VALUES
('Baja', 1, 1),
('Media', 2, 0),
('Alta', 3, 0);

GO
