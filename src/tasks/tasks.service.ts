import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Task, TaskDocument } from './schemas/task.schema';
import { UsersService } from '../users/users.service';
import { CreateTaskDto } from './dto/create-task.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<TaskDocument>,
    private readonly usersService: UsersService,
  ) {}

  async create(payload: CreateTaskDto): Promise<Task> {
    await this.usersService.findById(payload.userId);
    return this.taskModel.create(payload);
  }
  async findAll(): Promise<Task[]> {
    return this.taskModel.find().exec();
  }
  async findById(id: string): Promise<Task> {
    const task = await this.taskModel.findById(id).exec();
    if (!task) {
      throw new NotFoundException(`Tarea con ID ${id} no existe`);
    }
    return task;
  }
}
