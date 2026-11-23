import {
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { model, deleteModel } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { Task, TaskSchema } from './schemas/task.schema';
import { UsersService } from '../users/users.service';

const userId = '6af691f7ad6c0c0e2753eaf2';
const task = { title: 'Revisión', userId, completed: false };

describe('TasksController', () => {
  it('se puede crear con solo el servicio simulado y delega la creación', async () => {
    const service = { create: jest.fn().mockResolvedValue(task) };
    const module = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [{ provide: TasksService, useValue: service }],
    }).compile();
    expect(await module.get(TasksController).create(task)).toEqual(task);
    expect(service.create).toHaveBeenCalledWith(task);
    await module.close();
  });
});

describe('Tareas (HTTP)', () => {
  let app: INestApplication<App>;
  const users = { findById: jest.fn() };
  const tasks = {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    users.findById.mockResolvedValue({ _id: userId });
    tasks.create.mockImplementation((data) => Promise.resolve(data));
    tasks.find.mockReturnValue({ exec: () => Promise.resolve([task]) });
    tasks.findById.mockReturnValue({ exec: () => Promise.resolve(task) });
    const module = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        TasksService,
        { provide: UsersService, useValue: users },
        { provide: getModelToken(Task.name), useValue: tasks },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => app.close());

  it('permite consultas públicas', async () => {
    await request(app.getHttpServer()).get('/tasks').expect(200);
    await request(app.getHttpServer()).get('/tasks/123').expect(200);
  });

  it('rechaza POST sin autorización o con token incorrecto', async () => {
    await request(app.getHttpServer()).post('/tasks').send(task).expect(403);
    await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', 'incorrecto')
      .send(task)
      .expect(403);
    expect(tasks.create).not.toHaveBeenCalled();
  });

  it('rechaza atributos adicionales y datos inválidos', async () => {
    await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', 'admin-secret-token')
      .send({
        ...task,
        isAdmin: true,
        role: 'superuser',
        internalFlag: 'MODIFIED_BY_ATTACKER',
      })
      .expect(400);
    await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', 'admin-secret-token')
      .send({ title: '', userId: 'invalid' })
      .expect(400);
    expect(tasks.create).not.toHaveBeenCalled();
  });

  it('consulta al servicio de usuarios antes de guardar', async () => {
    await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', 'admin-secret-token')
      .send(task)
      .expect(201);
    expect(users.findById).toHaveBeenCalledWith(userId);
    expect(tasks.create).toHaveBeenCalledWith(task);
  });

  it('no guarda cuando el usuario no existe', async () => {
    users.findById.mockRejectedValue(new NotFoundException());
    await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', 'admin-secret-token')
      .send(task)
      .expect(404);
    expect(tasks.create).not.toHaveBeenCalled();
  });
});

describe('Esquema de tareas', () => {
  it('descarta campos ajenos al modelo incluso fuera del controlador', () => {
    const TaskModel = model('TaskStrictTest', TaskSchema);
    const doc = new TaskModel({ ...task, isAdmin: true, role: 'superuser' });
    expect(doc.toObject()).not.toHaveProperty('isAdmin');
    expect(doc.toObject()).not.toHaveProperty('role');
    deleteModel('TaskStrictTest');
  });
});
