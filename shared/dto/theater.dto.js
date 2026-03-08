"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateMonetizationDto = exports.CreateTheaterDto = exports.ReviewTheaterApplicationDto = exports.CreateTheaterApplicationDto = exports.ReviewAction = exports.PlatformFeeType = exports.ApplicationStatus = void 0;
const class_validator_1 = require("class-validator");
var ApplicationStatus;
(function (ApplicationStatus) {
    ApplicationStatus["PENDING"] = "PENDING";
    ApplicationStatus["APPROVED"] = "APPROVED";
    ApplicationStatus["REJECTED"] = "REJECTED";
})(ApplicationStatus || (exports.ApplicationStatus = ApplicationStatus = {}));
var PlatformFeeType;
(function (PlatformFeeType) {
    PlatformFeeType["PERCENTAGE"] = "PERCENTAGE";
    PlatformFeeType["FLAT"] = "FLAT";
})(PlatformFeeType || (exports.PlatformFeeType = PlatformFeeType = {}));
var ReviewAction;
(function (ReviewAction) {
    ReviewAction["APPROVE"] = "APPROVE";
    ReviewAction["REJECT"] = "REJECT";
})(ReviewAction || (exports.ReviewAction = ReviewAction = {}));
class CreateTheaterApplicationDto {
}
exports.CreateTheaterApplicationDto = CreateTheaterApplicationDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateTheaterApplicationDto.prototype, "theaterName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateTheaterApplicationDto.prototype, "ownerName", void 0);
__decorate([
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateTheaterApplicationDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsPhoneNumber)('IN'),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateTheaterApplicationDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateTheaterApplicationDto.prototype, "address", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateTheaterApplicationDto.prototype, "city", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateTheaterApplicationDto.prototype, "state", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
        message: 'Invalid GST Number format',
    }),
    __metadata("design:type", String)
], CreateTheaterApplicationDto.prototype, "gstNumber", void 0);
class ReviewTheaterApplicationDto {
}
exports.ReviewTheaterApplicationDto = ReviewTheaterApplicationDto;
__decorate([
    (0, class_validator_1.IsEnum)(ReviewAction),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ReviewTheaterApplicationDto.prototype, "action", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ReviewTheaterApplicationDto.prototype, "reviewNotes", void 0);
class CreateTheaterDto {
}
exports.CreateTheaterDto = CreateTheaterDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTheaterDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTheaterDto.prototype, "city", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTheaterDto.prototype, "address", void 0);
class UpdateMonetizationDto {
}
exports.UpdateMonetizationDto = UpdateMonetizationDto;
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateMonetizationDto.prototype, "enabled", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(PlatformFeeType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateMonetizationDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(1000),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateMonetizationDto.prototype, "value", void 0);
//# sourceMappingURL=theater.dto.js.map